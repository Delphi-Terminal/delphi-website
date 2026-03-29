export class TextSplit {
  constructor(element, options = {}) {
    this.element = element;
    this.type = options.type || 'words';
    this.originalHTML = element.innerHTML;
    this.words = [];
    this.chars = [];
    this.split();
  }

  split() {
    const text = this.element.textContent.trim();
    this.element.innerHTML = '';

    if (this.type === 'words' || this.type === 'both') {
      const words = text.split(/\s+/);
      words.forEach((word) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.style.display = 'inline-block';
        wordSpan.style.marginRight = '0.3em';

        if (this.type === 'both') {
          word.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.style.display = 'inline-block';
            charSpan.textContent = char;
            wordSpan.appendChild(charSpan);
            this.chars.push(charSpan);
          });
        } else {
          wordSpan.textContent = word;
        }

        this.element.appendChild(wordSpan);
        this.words.push(wordSpan);
      });
    } else if (this.type === 'chars') {
      const content = this.element.textContent;
      content.split('').forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.style.display = 'inline-block';
        if (char === ' ') {
          charSpan.innerHTML = '&nbsp;';
        } else {
          charSpan.textContent = char;
        }
        this.element.appendChild(charSpan);
        this.chars.push(charSpan);
      });
    }
  }

  revert() {
    this.element.innerHTML = this.originalHTML;
    this.words = [];
    this.chars = [];
  }
}
