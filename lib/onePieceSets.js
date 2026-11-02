// Datos de las expansiones de One Piece que la API (optcgapi.com) no trae:
// fecha de salida en inglés (pasadas por el usuario desde una lista de
// sets) y el logo del set en /public/tcg-sets/onepiece/<id>.png (bajados de
// Collectr con el fondo blanco sacado). Para un set nuevo: guardar su logo
// con el id del set como nombre y sumarlo acá con logo: true.
export const ONE_PIECE_SETS = {
  "OP-01": { date: "2022/12/01", logo: true },
  "OP-02": { date: "2023/03/09", logo: true },
  "OP-03": { date: "2023/06/29", logo: true },
  "OP-04": { date: "2023/09/21", logo: true },
  "OP-05": { date: "2023/12/07", logo: true },
  "OP-06": { date: "2024/03/14", logo: true },
  "EB-01": { date: "2024/05/02", logo: true },
  "OP-07": { date: "2024/06/27", logo: true },
  "OP-08": { date: "2024/09/12", logo: true },
  "PRB-01": { date: "2024/11/07", logo: true },
  "OP-09": { date: "2024/12/12", logo: true },
  "OP-10": { date: "2025/03/20", logo: true },
  "EB-02": { date: "2025/05/08", logo: true },
  "OP-11": { date: "2025/06/05", logo: true },
  "OP-12": { date: "2025/08/21", logo: true },
  "PRB-02": { date: "2025/10/02", logo: true },
  "OP-13": { date: "2025/11/06", logo: true },
  "OP14-EB04": { date: "2026/01/15", logo: true },
  "EB-04": { date: "2026/01/31", logo: true }, // fecha de Japón (en inglés no salió suelto)
  "EB-03": { date: "2026/02/19", logo: true },
  "OP15-EB04": { date: "2026/04/02", logo: true },
  "OP-16": { date: "2026/06/11", logo: true },
  "OP-17": { date: "2026/08/27", logo: true }
};

// Sets que en inglés no salieron sueltos y la API no tiene como set propio:
// se arman juntando de otros sets las cartas con ese código. Egghead Crisis
// (EB-04) salió solo en Japón; en inglés sus cartas vinieron mezcladas en
// The Azure Sea's Seven y Adventure on Kami's Island.
export const ONE_PIECE_VIRTUAL_SETS = {
  "EB-04": {
    name: "Extra Booster: Egghead Crisis",
    from: ["OP14-EB04", "OP15-EB04"],
    prefix: "EB04"
  }
};

export function onePieceSetExtra(id) {
  const s = ONE_PIECE_SETS[id];
  if (!s) return { releaseDate: null, logo: null };
  return { releaseDate: s.date, logo: s.logo ? `/tcg-sets/onepiece/${id}.png` : null };
}
