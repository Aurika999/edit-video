import logo from '../assets/stickere/1-logo-minge.png';
import gol from '../assets/stickere/2-gol.png';
import aboneaza from '../assets/stickere/3-aboneaza-te.png';
import exercitiu from '../assets/stickere/4-exercitiul-zilei.png';
import bravo from '../assets/stickere/5-bravo.png';
import bara from '../assets/stickere/6-bara-nume.png';

// Ca sa adaugi un sticker nou pentru totdeauna: pune PNG-ul in src/assets/stickere,
// importa-l mai sus si adauga-l in lista de mai jos.
export const BUILTIN_STICKERS = [
  { name: 'Logo RĂZVAN', src: logo },
  { name: 'GOOOL', src: gol },
  { name: 'Abonează-te', src: aboneaza },
  { name: 'Exercițiul zilei', src: exercitiu },
  { name: 'Bravo', src: bravo },
  { name: 'Bara cu nume', src: bara },
];
