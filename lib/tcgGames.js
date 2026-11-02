// Catálogo de juegos TCG que se pueden agregar a la sección TCG. Cada juego
// es un "estante" con sus propias carpetas adentro. Solo One Piece y
// Pokémon tienen una API pública para exportar expansiones enteras
// (api: true); el resto se arma con carpetas a mano.
//
// logo: nombre del archivo en /public/tcg-logos (de Wikimedia Commons, de
// dominio público; el de One Piece lo pasó el usuario). Sin logo (o si falla al cargar), la
// tarjeta muestra el nombre con los colores del juego. logoLight: el logo
// viene en tinta oscura y sobre el fondo violeta no se leía — se pinta claro.
export const TCG_GAMES = [
  { key: "pokemon", logo: "pokemon.svg", name: "Pokémon", api: true, colors: ["#FFCB05", "#2A75BB"] },
  { key: "onepiece", logo: "onepiece-tcg.png", name: "One Piece", api: true, colors: ["#F5F1F8", "#B3261E"] },
  { key: "magic", logo: "magic.svg", logoLight: true, name: "Magic: The Gathering", api: false, colors: ["#E8D7B0", "#C0392B"] },
  { key: "yugioh", logo: "yugioh.png", name: "Yu-Gi-Oh!", api: false, colors: ["#F2C14E", "#8B1E1E"] },
  { key: "lorcana", name: "Disney Lorcana", api: false, colors: ["#E6C77A", "#3B2F5E"] },
  { key: "fab", name: "Flesh and Blood", api: false, colors: ["#E8B04B", "#7A1F1F"] },
  { key: "riftbound", name: "Riftbound", api: false, colors: ["#F0A93B", "#2C3E50"] },
  { key: "dbfw", name: "Dragon Ball Fusion World", api: false, colors: ["#FFFFFF", "#E8590C"] },
  { key: "dbs", name: "Dragon Ball Super", api: false, colors: ["#FFD43B", "#D9480F"] },
  { key: "digimon", logo: "digimon.svg", name: "Digimon", api: false, colors: ["#4DABF7", "#1C3D8C"] },
  { key: "unionarena", name: "Union Arena", api: false, colors: ["#FFFFFF", "#C92A2A"] },
  { key: "starwars", logo: "starwars.svg", name: "Star Wars Unlimited", api: false, colors: ["#F1F3F5", "#495057"] },
  { key: "weiss", name: "Weiß Schwarz", api: false, colors: ["#F8F9FA", "#343A40"] },
  { key: "gundam", name: "Gundam", api: false, colors: ["#E9ECEF", "#1864AB"] },
  { key: "sorcery", name: "Sorcery", api: false, colors: ["#74C0FC", "#1D3557"] },
  { key: "finalfantasy", name: "Final Fantasy", api: false, colors: ["#DEE2E6", "#5C5F66"] },
  { key: "otros", name: "Otros TCG", api: false, colors: ["#B2A6C2", "#523874"] }
];

const BY_KEY = Object.fromEntries(TCG_GAMES.map((g) => [g.key, g]));

export function tcgGame(key) {
  return BY_KEY[key] || BY_KEY.otros;
}

export function tcgLogoUrl(key) {
  const game = tcgGame(key);
  return game.logo ? `/tcg-logos/${game.logo}` : null;
}
