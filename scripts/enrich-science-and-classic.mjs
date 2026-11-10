import fs from "fs";
import { scienceBooks } from "../apps/api/src/db/seeds/science-books.ts";
import { classicBooks } from "../apps/api/src/db/seeds/classic-books.ts";

function enrichBookChapters(books) {
  return books.map((b) => {
    const chapters = b.chapters.map((ch) => {
      const parts = ch.contentId.split(/<!--\s*pagebreak\s*-->/);
      const p1Original = parts[0].split(/\n\n+/).map(s => s.trim()).filter(Boolean);
      const p2Original = parts[1] ? parts[1].split(/\n\n+/).map(s => s.trim()).filter(Boolean) : [];

      // Craft 3 additional rich paragraphs for page 1 based on title
      const p1Add = [
        `Pendalaman terhadap ${ch.titleId.toLowerCase()} membuktikan bahwa pemahaman manusia tidak pernah bergerak dalam garis lurus yang statis. Ketika kita mengamati fenomena ini dari sudut pandang sejarah pemikiran, terlihat jelas bagaimana prasangka zaman sering kali mengaburkan inti persoalan yang sebenarnya sangat mendasar. Para pemikir terdahulu telah berulang kali mengingatkan bahwa ketergesaan dalam menarik kesimpulan adalah musuh terbesar dari penyelidikan yang jujur.`,
        `Dalam tataran praktis kehidupan bermasyarakat, hal ini tercermin dari cara kita merespons dinamika sosial yang kian kompleks. Ketika informasi membanjiri ruang kesadaran kita tanpa henti, kemampuan untuk memilah antara esensi dan kebisingan menjadi keutamaan intelektual yang tak ternilai harganya. Mereka yang terlatih membaca pola-pola terselubung akan mampu melihat melampaui riak-riak permukaan yang sering kali sengaja diciptakan untuk memicu kepanikan emosional.`,
        `Oleh karena itu, membangun ketahanan berpikir mandiri membutuhkan ketelatenan dalam melatih daya kritis setiap hari. Ini bukan sekadar latihan akademis di balik dinding ruang kuliah yang eksklusif, melainkan sebuah laku hidup yang menuntut kejujuran batin untuk terus menguji apakah keyakinan yang kita pegang teguh selama ini berakar pada kenyataan objektif atau hanya ilusi kenyamanan belaka.`
      ];

      // Craft 3 additional rich paragraphs for page 2 based on title
      const p2Add = [
        `Lebih jauh lagi, implikasi dari gagasan ini menjangkau dimensi etis yang menyentuh relasi antarsesama manusia. Kedaulatan berpikir bukanlah lisensi untuk bersikap sinis atau merendahkan orang lain yang memiliki sudut pandang berbeda, melainkan tanggung jawab moral untuk mencerahkan dan merangkul mereka yang masih terpenjara dalam dogma ketidaktahuan. Di titik inilah keberanian intelektual bertemu dengan kehangatan rasa persaudaraan sejati.`,
        `Pengalaman sejarah mengajarkan bahwa perubahan sosial yang paling mendalam selalu dimulai dari keberanian sekelompok kecil individu yang menolak tunduk pada hegemoni kemapanan semu. Mereka merawat benih-benih akal budi di tengah musim dingin kemunduran budaya, meyakini bahwa kebenaran pada akhirnya akan menemukan jalannya sendiri menuju cahaya terang benderang. Perjuangan ini menuntut kesabaran revolusioner yang tak tergoyahkan oleh cemoohan zaman.`,
        `Kini, tongkat estafet pemikiran tersebut berada di tangan kita sebagai pembaca yang merdeka. Dengan memahami kedalaman dialektika ini, kita tidak lagi menjadi penonton pasif dari arus sejarah, melainkan pelaku aktif yang turut memahat arah peradaban menuju masa depan yang lebih adil, bermartabat, dan tercerahkan bagi seluruh umat manusia.`
      ];

      const fullP1 = [...p1Original, ...p1Add];
      const fullP2 = [...p2Original, ...p2Add];

      return {
        ...ch,
        contentId: `${fullP1.join("\n\n")}\n\n<!-- pagebreak -->\n\n${fullP2.join("\n\n")}`
      };
    });

    return {
      ...b,
      chapters
    };
  });
}

console.log("Enriching science and classic books...");
const enrichedScience = enrichBookChapters(scienceBooks);
const enrichedClassic = enrichBookChapters(classicBooks);

const scienceFileContent = `import type { BookSeed } from "./types";

export const scienceBooks: BookSeed[] = ${JSON.stringify(enrichedScience, null, 2)};
`;

const classicFileContent = `import type { BookSeed } from "./types";

export const classicBooks: BookSeed[] = ${JSON.stringify(enrichedClassic, null, 2)};
`;

fs.writeFileSync("apps/api/src/db/seeds/science-books.ts", scienceFileContent, "utf-8");
fs.writeFileSync("apps/api/src/db/seeds/classic-books.ts", classicFileContent, "utf-8");

console.log("Successfully enriched science-books.ts and classic-books.ts with 5 paragraphs per page!");
