const MusicEngine = (() => {
  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const ROMAN_MAP = {
    'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,
    'i':1,'ii':2,'iii':3,'iv':4,'v':5,'vi':6,'vii':7
  };
  const ROMAN_RE = /\b([b#♭♯])?((?:III|VII|II|IV|VI|ii|iii|vii|vi|iv|I|V|i|v))((?:m|Δ|dim|°|o|maj|M|aug|\+)\d*|\d*)?(?!\w)/g;
  const CHORD_RE = /\b([A-G])([#b])?(maj|m|dim|°|o|aug|\+)?(\d*)(sus\d*)?(add\d*)?(?!\w*[a-z])/g;
  const BRACKET_RE = /\[([^\]]*)\]/g;
  const CHORD_IN_BRACKET_RE = /^([A-G][#b]?)(m|dim|°|o|aug|\+|maj|M|Δ)?(\d*)(sus\d*)?(add\d*)?$/;
  const DEGREE_IN_BRACKET_RE = /^([b#♭♯]?)((?:III|VII|II|IV|VI|ii|iii|vii|vi|iv|I|V|i|v))((?:m|Δ|dim|°|o|maj|M|aug|\+)\d*|\d*)?$/;

  function buildMajorScale(root) {
    const idx = CHROMATIC.indexOf(root);
    if (idx === -1) return null;
    return [0, 2, 4, 5, 7, 9, 11].map(i => CHROMATIC[(idx + i) % 12]);
  }
  function noteAt(idx) { return CHROMATIC[((idx % 12) + 12) % 12]; }

  // --- ChordPro Parsing ---
  function parseChordPro(text) {
    const lines = text.split('\n');
    return lines.map(line => {
      const pairs = [];
      let lyrics = '';
      let lastEnd = 0;
      let match;
      const re = /\[([^\]]*)\]/g;
      while ((match = re.exec(line)) !== null) {
        lyrics += line.slice(lastEnd, match.index);
        const chordName = match[1].trim();
        if (chordName) {
          pairs.push({ chord: chordName, position: lyrics.length });
        }
        lastEnd = match.index + match[0].length;
      }
      lyrics += line.slice(lastEnd);
      return { chords: pairs, lyrics };
    });
  }

  // --- Render ChordPro as chords-above-lyrics ---
  function renderPreview(text) {
    const lines = parseChordPro(text);
    return lines.map(({ chords, lyrics }) => {
      if (chords.length === 0) return '<div class="l-line">' + escapeHtml(lyrics) + '</div>';
      const chars = lyrics.split('');
      const lineLen = Math.max(lyrics.length, chords[chords.length - 1].position + 12);
      const chordChars = new Array(lineLen).fill(' ');
      for (const c of chords) {
        const name = c.chord;
        for (let i = 0; i < name.length; i++) {
          if (c.position + i < lineLen) chordChars[c.position + i] = name[i];
        }
      }
      let chordHtml = '';
      for (let i = 0; i < lineLen; i++) {
        const ch = chordChars[i];
        if (ch !== ' ') {
          chordHtml += '<span class="chord">' + ch + '</span>';
        } else {
          chordHtml += ' ';
        }
      }
      const lyricHtml = lyrics || '\u00A0';
      return '<div class="c-line">' + chordHtml + '</div><div class="l-line">' + escapeHtml(lyricHtml) + '</div>';
    }).join('\n');
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // --- Convert degrees within brackets ---
  function convertDegrees(text, root) {
    const scale = buildMajorScale(root);
    if (!scale) return text;

    return text.replace(BRACKET_RE, (match, content) => {
      const trimmed = content.trim();
      const m = trimmed.match(DEGREE_IN_BRACKET_RE);
      if (!m) return match;

      const alter = m[1];
      const roman = m[2];
      const qual = m[3] || '';
      const degree = ROMAN_MAP[roman];
      if (!degree) return match;

      const isMinor = roman === roman.toLowerCase();
      let idx = CHROMATIC.indexOf(scale[degree - 1]);
      if (alter === 'b' || alter === '♭') idx--;
      if (alter === '#' || alter === '♯') idx++;
      const note = noteAt(idx);

      const q = qual.toLowerCase();
      const ext = q.replace(/^[a-z°Δ+]+/, '');
      const type = q.replace(/\d+$/, '');

      let chord = note;
      if (type === 'm' || type === '') {
        if (isMinor) chord = note + 'm';
      } else if (type === 'dim' || type === '°' || type === 'o') {
        chord = note + 'dim';
      } else if (type === 'aug' || type === '+') {
        chord = note + 'aug';
      } else if (type === 'maj' || type === 'Δ') {
        chord = note + (type === 'Δ' ? 'Δ' : 'maj');
      }
      if (ext) chord += ext;

      return '[' + chord + ']';
    });
  }

  // --- Transpose chords within brackets ---
  function transpose(text, semitones) {
    return text.replace(BRACKET_RE, (match, content) => {
      const trimmed = content.trim();
      const m = trimmed.match(CHORD_IN_BRACKET_RE);
      if (!m) return match;

      const root = m[1];
      const qual = m[2] || '';
      const ext = m[3] || '';
      const sus = m[4] || '';
      const add = m[5] || '';

      const idx = CHROMATIC.indexOf(root);
      if (idx === -1) return match;

      const newRoot = noteAt(idx + semitones);
      return '[' + newRoot + qual + ext + sus + add + ']';
    });
  }

  // --- Detect if a line is a chord line (plain text import) ---
  function isChordLine(line) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 2) return false;
    let chordCount = 0;
    for (const t of tokens) {
      if (/^[A-G][#b]?(m|dim|°|o|aug|\+|\d|sus|add|maj|M|Δ)*$/.test(t)) chordCount++;
      else if (/^[b#♭♯]?[IVXivx]+(m|Δ|dim|°|o|maj|M|aug|\+|\d)*$/.test(t)) chordCount++;
    }
    return chordCount / tokens.length > 0.5;
  }

  // --- Convert plain chord sheet (chords above lyrics) to ChordPro ---
  function plainToChordPro(text) {
    const lines = text.split('\n');
    const result = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (isChordLine(line) && i + 1 < lines.length) {
        const chordLine = line;
        const lyricLine = lines[i + 1];
        const chordProLine = mergeChordLine(chordLine, lyricLine);
        result.push(chordProLine);
        i += 2;
      } else {
        result.push(line);
        i++;
      }
    }
    return result.join('\n');
  }

  function mergeChordLine(chordLine, lyricLine) {
    const chars = chordLine.split('');
    const chords = [];
    let inChord = false;
    let start = -1;
    for (let j = 0; j <= chars.length; j++) {
      const ch = j < chars.length ? chars[j] : ' ';
      const isChordChar = /^[A-Ga-gIVXivx#b♭♯mΔ°odimsuaug\+]$/.test(ch);
      if (isChordChar && !inChord) {
        inChord = true;
        start = j;
      } else if (!isChordChar && inChord) {
        inChord = false;
        const name = chars.slice(start, j).join('').trim();
        if (name.length > 0) chords.push({ name, position: start });
      }
    }

    // Merge overlapping chords (e.g., "A m" should be "Am")
    const merged = [];
    for (const c of chords) {
      if (merged.length > 0 && c.position === merged[merged.length - 1].position) {
        merged[merged.length - 1].name += c.name;
      } else {
        merged.push(c);
      }
    }

    // Filter out non-chord tokens
    const valid = merged.filter(c => {
      const n = c.name.trim();
      return /^[A-G][#b]?(m|dim|°|o|aug|\+|\d|sus|add|maj|M|Δ)*$/.test(n) ||
             /^[b#♭♯]?[IVXivx]+(m|Δ|dim|°|o|maj|M|aug|\+|\d)*$/.test(n);
    });

    if (valid.length === 0) return chordLine;

    // Build ChordPro line: insert [Chord] at positions
    const lyricChars = (lyricLine || '').split('');
    let out = '';
    let pos = 0;
    for (const c of valid) {
      while (pos < c.position && pos < lyricChars.length) {
        out += lyricChars[pos];
        pos++;
      }
      out += '[' + c.name.trim() + ']';
    }
    while (pos < lyricChars.length) {
      out += lyricChars[pos];
      pos++;
    }
    return out || chordLine;
  }

  // --- Check if text is already ChordPro ---
  function isChordPro(text) {
    return /\[([^\]]*)\]/.test(text);
  }

  // --- Import: auto-detect and convert ---
  function importText(text) {
    if (isChordPro(text)) return text;
    return plainToChordPro(text);
  }

  function getAvailableRoots() { return CHROMATIC.slice(); }

  return {
    convertDegrees, transpose, getAvailableRoots, CHROMATIC,
    parseChordPro, renderPreview, importText, isChordPro, isChordLine
  };
})();
