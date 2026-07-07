const MusicEngine = (() => {
  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const ROMAN_MAP = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7,
  };

  const ROMAN_RE = /\b([b#♭♯])?((?:III|VII|II|IV|VI|ii|iii|vii|vi|iv|I|V|i|v))((?:m|Δ|dim|°|o|maj|M|aug|\+)\d*|\d*)?(?!\w)/g;

  const CHORD_RE = /\b([A-G])([#b])?(maj|m|dim|°|o|aug|\+)?(\d*)(sus\d*)?(add\d*)?(?!\w*[a-z])/g;

  function buildMajorScale(root) {
    const idx = CHROMATIC.indexOf(root);
    if (idx === -1) return null;
    const intervals = [0, 2, 4, 5, 7, 9, 11];
    return intervals.map(i => CHROMATIC[(idx + i) % 12]);
  }

  function noteIndex(note) {
    return CHROMATIC.indexOf(note);
  }

  function noteAt(idx) {
    return CHROMATIC[((idx % 12) + 12) % 12];
  }

  function convertDegrees(text, root) {
    const scale = buildMajorScale(root);
    if (!scale) return text;

    return text.replace(ROMAN_RE, (match, alter, roman, qual) => {
      const degree = ROMAN_MAP[roman];
      if (!degree) return match;

      const isMinor = roman === roman.toLowerCase();
      const baseNote = scale[degree - 1];
      let idx = noteIndex(baseNote);

      if (alter === 'b' || alter === '♭') idx -= 1;
      if (alter === '#' || alter === '♯') idx += 1;

      const note = noteAt(idx);
      let chord = note;
      const q = (qual || '').toLowerCase();

      // Split qualifier into type suffix and extension digits
      const ext = q.replace(/^[a-z°Δ+]+/, '');
      const type = q.replace(/\d+$/, '');

      if (type === 'm' || type === '') {
        if (isMinor) chord = note + 'm';
      } else if (type === 'dim' || type === '°' || type === 'o') {
        chord = note + 'dim';
      } else if (type === 'aug' || type === '+') {
        chord = note + 'aug';
      } else if (type === 'Δ') {
        chord = note + 'Δ';
      } else if (type === 'maj') {
        chord = note + 'maj';
      }

      if (ext) chord += ext;

      return chord;
    });
  }

  function transpose(text, semitones) {
    return text.replace(CHORD_RE, (match, root, acc, qual, ext, sus, add) => {
      const idx = noteIndex(root + (acc || ''));
      if (idx === -1) return match;
      const newIdx = idx + semitones;
      const newRoot = noteAt(newIdx);
      return newRoot + (qual || '') + (ext || '') + (sus || '') + (add || '');
    });
  }

  function getAvailableRoots() {
    return CHROMATIC.slice();
  }

  return { convertDegrees, transpose, getAvailableRoots, CHROMATIC };
})();
