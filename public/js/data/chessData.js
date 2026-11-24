export const CHESS_PUZZLES = [
  {
    "title": "Back-Rank Rook Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "6k1/5ppp/8/8/8/8/5PPP/3R2K1",
    "from": "d1",
    "to": "d8",
    "note": "Rd8# delivers a textbook back-rank checkmate."
  },
  {
    "title": "Smothered Knight Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "6rk/6pp/7N/8/8/8/5PPP/6K1",
    "from": "h6",
    "to": "f7",
    "note": "Nf7# \u2014 pure smothered checkmate! Black's own pieces trap the king."
  },
  {
    "title": "Scholar's Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR",
    "from": "h5",
    "to": "f7",
    "note": "Qxf7# \u2014 Queen protected by the c4 Bishop delivers instant checkmate."
  },
  {
    "title": "Bishop-Queen Kiss",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "5rk1/5p1p/5Bp1/8/8/6Q1/5PPP/6K1",
    "from": "g3",
    "to": "g7",
    "note": "Qg7# \u2014 the f6 Bishop guards g7 while sealing the corner."
  },
  {
    "title": "Arabian Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "7k/8/5N2/8/8/8/6R1/6K1",
    "from": "g2",
    "to": "g8",
    "note": "Rg8# \u2014 classic Arabian Mate! The f6 Knight guards g8 and controls h7."
  },
  {
    "title": "Ladder Mate Finish",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "4k3/R7/8/8/8/8/1R6/6K1",
    "from": "b2",
    "to": "b8",
    "note": "Rb8# \u2014 twin rooks sweep the 7th and 8th ranks cleanly."
  },
  {
    "title": "Queen + King Kiss Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "7k/8/6K1/8/8/8/7Q/8",
    "from": "h2",
    "to": "h7",
    "note": "Qh7# \u2014 protected by the White King on g6."
  },
  {
    "title": "Fool's Mate (Black)",
    "type": "Mate in 1",
    "turn": "Black",
    "fen": "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR",
    "from": "d8",
    "to": "h4",
    "note": "Qh4# \u2014 the fastest possible checkmate in chess!"
  },
  {
    "title": "Pawn-Backed Queen Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "5rk1/5p1p/5P2/8/8/6Q1/5PPP/6K1",
    "from": "g3",
    "to": "g7",
    "note": "Qg7# \u2014 the f6 pawn protects the Queen for checkmate."
  },
  {
    "title": "Morphy's Opera Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "4k3/3p1p2/8/6B1/8/8/5PPP/3R2K1",
    "from": "d1",
    "to": "d8",
    "note": "Rd8# \u2014 the g5 Bishop guards d8 while Black's pawns block escape!"
  },
  {
    "title": "Anastasia's Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "5r2/4Nppk/8/8/8/4R3/5PPP/6K1",
    "from": "e3",
    "to": "h3",
    "note": "Rh3# \u2014 Knight on e7 takes away g8 and g6 while the Rook seals the h-file."
  },
  {
    "title": "Corner Bishop Mate",
    "type": "Mate in 1",
    "turn": "White",
    "fen": "7k/6p1/6K1/8/3B4/8/8/8",
    "from": "d4",
    "to": "g7",
    "note": "Bxg7# \u2014 protected by the White King on g6, cutting off every square."
  },
  {
    "title": "Royal Knight Fork",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "2k3q1/8/8/5N2/8/8/8/6K1",
    "from": "f5",
    "to": "e7",
    "note": "Ne7+! Forks Black's King on c8 and Queen on g8 simultaneously."
  },
  {
    "title": "Knight Fork (King & Queen)",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "4k3/8/8/1q6/2N5/8/8/6K1",
    "from": "c4",
    "to": "d6",
    "note": "Nd6+! Simultaneously checks the Black King on e8 and attacks the Queen on b5."
  },
  {
    "title": "Queen Double Diagonal Fork",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "6k1/5ppp/8/8/8/8/r4PPP/3Q2K1",
    "from": "d1",
    "to": "d5",
    "note": "Qd5+! Checks the King on g8 (d5-g8) while attacking the undefended Rook on a2 (d5-a2)!"
  },
  {
    "title": "Bishop Double-Rook Fork",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "r5r1/5pk1/8/8/2B5/8/5PPP/6K1",
    "from": "c4",
    "to": "d5",
    "note": "Bd5! Strikes both Black Rooks on a8 and g8 along twin diagonals."
  },
  {
    "title": "Pawn Fork (Knight & Bishop)",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "6k1/5ppp/8/2n1b3/8/3P4/5PPP/6K1",
    "from": "d3",
    "to": "d4",
    "note": "d4! A humble pawn advances to fork Black's Knight on c5 and Bishop on e5."
  },
  {
    "title": "Queen Fork (King & Knight)",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "4k3/5ppp/8/n7/8/8/5PPP/3Q2K1",
    "from": "d1",
    "to": "a4",
    "note": "Qa4+! Checks the Black King on e8 along the diagonal while winning the undefended Knight on a5."
  },
  {
    "title": "Knight Fork on f7",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "r2qk2r/ppp2ppp/8/4N3/8/8/PPP2PPP/R3K2R",
    "from": "e5",
    "to": "f7",
    "note": "Nxf7! Forks Black's Queen on d8 and Rook on h8 simultaneously."
  },
  {
    "title": "Knight Fork on c7",
    "type": "Tactical Fork",
    "turn": "White",
    "fen": "r3k3/ppp2ppp/8/3N4/8/8/PPP2PPP/4K3",
    "from": "d5",
    "to": "c7",
    "note": "Nxc7+! Checks the King on e8 while attacking the undefended Rook on a8."
  }
];

export const CHESS_GMS = [
  {
    "name": "Magnus Carlsen",
    "country": "Norway",
    "peak": 2882,
    "era": "Modern",
    "username": "magnuscarlsen",
    "note": "5x World Champion, highest classical rating in history"
  },
  {
    "name": "Garry Kasparov",
    "country": "Russia",
    "peak": 2851,
    "era": "Legend",
    "username": null,
    "note": "Dominated #1 for 20 years, 13th World Champion"
  },
  {
    "name": "Fabiano Caruana",
    "country": "USA",
    "peak": 2844,
    "era": "Modern",
    "username": "fabianocaruana",
    "note": "2018 World Championship challenger & Sinquefield Cup legend"
  },
  {
    "name": "Levon Aronian",
    "country": "USA / Armenia",
    "peak": 2830,
    "era": "Modern",
    "username": "levonaronian",
    "note": "2x World Cup winner & Olympiad gold medalist"
  },
  {
    "name": "Wesley So",
    "country": "USA",
    "peak": 2822,
    "era": "Modern",
    "username": "gmwso",
    "note": "First Fischer Random World Champion"
  },
  {
    "name": "Shakhriyar Mamedyarov",
    "country": "Azerbaijan",
    "peak": 2820,
    "era": "Modern",
    "username": null,
    "note": "Explosive tactical super-GM"
  },
  {
    "name": "Maxime Vachier-Lagrave",
    "country": "France",
    "peak": 2819,
    "era": "Modern",
    "username": "lyonbeast",
    "note": "World Blitz Champion & Najdorf specialist"
  },
  {
    "name": "Viswanathan Anand",
    "country": "India",
    "peak": 2817,
    "era": "Legend",
    "username": null,
    "note": "5x World Champion & India's first Grandmaster"
  },
  {
    "name": "Vladimir Kramnik",
    "country": "Russia",
    "peak": 2817,
    "era": "Legend",
    "username": null,
    "note": "14th World Champion who defeated Kasparov in 2000"
  },
  {
    "name": "Veselin Topalov",
    "country": "Bulgaria",
    "peak": 2816,
    "era": "Legend",
    "username": null,
    "note": "2005 FIDE World Champion"
  },
  {
    "name": "Hikaru Nakamura",
    "country": "USA",
    "peak": 2816,
    "era": "Modern",
    "username": "hikaru",
    "note": "5x US Champion & blitz powerhouse"
  },
  {
    "name": "Ding Liren",
    "country": "China",
    "peak": 2816,
    "era": "Modern",
    "username": null,
    "note": "17th World Chess Champion (2023)"
  },
  {
    "name": "Alireza Firouzja",
    "country": "France",
    "peak": 2804,
    "era": "Modern",
    "username": "firouzja2003",
    "note": "Youngest player ever to cross 2800 Elo"
  },
  {
    "name": "Anish Giri",
    "country": "Netherlands",
    "peak": 2798,
    "era": "Modern",
    "username": "anishgiri",
    "note": "Tata Steel Champion & opening theoretician"
  },
  {
    "name": "Ian Nepomniachtchi",
    "country": "Russia",
    "peak": 2795,
    "era": "Modern",
    "username": "lachesisq",
    "note": "2x Candidates Tournament winner"
  },
  {
    "name": "Gukesh Dommaraju",
    "country": "India",
    "peak": 2794,
    "era": "Modern",
    "username": "gukeshdommaraju",
    "note": "Youngest World Chess Champion in history (2024)"
  },
  {
    "name": "Arjun Erigaisi",
    "country": "India",
    "peak": 2801,
    "era": "Modern",
    "username": "ghandeevam2003",
    "note": "Second Indian player to break 2800 Elo"
  },
  {
    "name": "R. Praggnanandhaa",
    "country": "India",
    "peak": 2758,
    "era": "Modern",
    "username": "rpragchess",
    "note": "2023 Chess World Cup finalist & Tata Steel 2025 winner"
  },
  {
    "name": "Bobby Fischer",
    "country": "USA",
    "peak": 2785,
    "era": "Legend",
    "username": null,
    "note": "11th World Champion, 20-game winning streak"
  },
  {
    "name": "Anatoly Karpov",
    "country": "Russia",
    "peak": 2780,
    "era": "Legend",
    "username": null,
    "note": "12th World Champion & positional master"
  },
  {
    "name": "Mikhail Tal",
    "country": "Latvia",
    "peak": 2705,
    "era": "Legend",
    "username": null,
    "note": "8th World Champion \u2014 'The Magician from Riga'"
  },
  {
    "name": "Judit Polg\u00e1r",
    "country": "Hungary",
    "peak": 2735,
    "era": "Legend",
    "username": null,
    "note": "Strongest female player in chess history, top 8 overall"
  },
  {
    "name": "Nodirbek Abdusattorov",
    "country": "Uzbekistan",
    "peak": 2783,
    "era": "Modern",
    "username": "chesswarrior7197",
    "note": "Youngest World Rapid Champion"
  },
  {
    "name": "Vincent Keymer",
    "country": "Germany",
    "peak": 2743,
    "era": "Modern",
    "username": null,
    "note": "Germany's top super-GM"
  },
  {
    "name": "Vidit Gujrathi",
    "country": "India",
    "peak": 2747,
    "era": "Modern",
    "username": "viditchess",
    "note": "2023 FIDE Grand Swiss winner & Olympiad gold"
  },
  {
    "name": "Koneru Humpy",
    "country": "India",
    "peak": 2623,
    "era": "Modern",
    "username": null,
    "note": "2x Women's World Rapid Champion"
  }
];
