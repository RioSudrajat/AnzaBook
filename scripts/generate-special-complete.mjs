import fs from "fs";
import path from "path";

// Helper to assemble chapter
function c(num, titleId, titleEn, p1, p2) {
  const text1 = p1.join("\n\n");
  const text2 = p2.join("\n\n");
  return {
    chapterNumber: num,
    titleId,
    titleEn,
    contentId: `${text1}\n\n<!-- pagebreak -->\n\n${text2}`,
    contentEn: null,
    audioUrl: null,
    audioDurationSec: null
  };
}

// 1. Ghost Back to Campus
export const ghostChapters = [
  c(
    1,
    "Semester Abadi dan Kunci Laboratorium Terlarang",
    "The Eternal Semester and the Forbidden Lab Key",
    [
      "Bagi Rendy dan komplotan mahasiswa semester tiga belas di Fakultas Sains, ancaman surat drop out dari dekanat sesungguhnya jauh lebih mengerikan ketimbang seluruh hantu penunggu kampus Nusantara jika digabungkan. Pagi itu aroma kopi saset basi bercampur kepulan rokok kretek murahan di kosan Anton menjadi saksi betapa suramnya masa depan mereka jika bab empat skripsi tak kunjung disetujui dalam dua pekan ke depan.",
      "Masalah utamanya adalah data penelitian Rendy tentang mutasi jamur anaerob tertinggal di komputer usang laboratorium lantai empat gedung lama. Gedung itu sudah resmi ditutup sejak tragedi gempa lima tahun lalu, dan desas-desus tentang suara langkah kaki berseret serta bau formalin menyengat membuat satpam kampus sekalipun ogah berpatroli ke sana sendirian.",
      "Namun ketika Pak Joko, satpam paruh baya yang doyan tertidur di pos barat, tak sengaja menjatuhkan segendel kunci berkarat saat terlelap di meja jaga, mata Rendy dan Anton saling bertaut. Kunci itu berlabel kuningan kusam dengan torehan angka 'Lab 402'. Keduanya tahu bahwa ini adalah kesempatan terakhir menyelamatkan sisa martabat akademis mereka sebelum gelar mahasiswa abadi dipatenkan secara permanen.",
      "Mereka menunggu hingga jam digital di menara rektorat berdentang dua belas kali di tengah malam berangin. Udara dingin lembap khas perbukitan kampus merayap menusuk tulang saat keduanya melompati pagar tanaman perdu berduri di belakang aula rektorat, berbekal senter ponsel dan segenggam jimat penangkal sawan pinjaman dari neneknya Anton.",
      "Suasana lorong lantai satu gedung lama begitu sunyi hingga derak daun kering yang terinjak sepatu kets mereka terdengar seperti letupan mercon banting. Plafon tripleks yang menjuntai tampak seperti lidah-lidah raksasa yang lapar, sementara debu pekat berterbangan menari-nari dalam sorotan cahaya senter yang mulai meremang kehabisan baterai."
    ],
    [
      "Ketika mereka tiba di depan pintu Lab 402, aroma kloroform dan formalin menusuk hidung begitu tajam sampai Rendy terbatuk-batuk menahan mual. Engsel pintu besi berdecit memekakkan telinga saat kunci kuningan itu diputar dengan susah payah, mengeluarkan lolongan logam tua yang bergema ke seluruh penjuru lantai empat.",
      "Di dalam ruangan, meja-meja praktikum berdebu berbaris rapi seperti nisan kuburan massal. Di sudut terjauh, monitor tabung CRT jadul berwarna krem mendadak menyala sendiri dengan bunyi dengungan listrik tegangan tinggi berkedip-kedip hijau menampilkan layar DOS bertuliskan teks berulang: 'KEMBALIKAN DATA SAYA ATAU KITA MENELITI BERSAMA SELAMANYA'.",
      "Anton sontak menjerit tertahan sambil merapatkan punggungnya ke dinding lemari kaca manekin. Celakanya, manekin anatomi plastik berkepala botak separuh di dalam lemari itu perlahan memutar lehernya ke arah Anton dengan bunyi krek yang sangat renyah, sebelum salah satu bola matanya yang terbuat dari akrilik menggelinding jatuh ke lantai marmer tepat di ujung jari kakinya.",
      "'Ren, demi Tuhan, ini bukan hantu biasa... ini hantu ber-IPK cumlaude!' desis Anton dengan lutut gemetaran hebat hingga ponselnya jatuh terselip di bawah rak mikroskop berdebu.",
      "Tepat saat itu, terdengar derap langkah sepatu pantofel bertumit keras berderap santai dari luar lorong mendekati pintu lab, diiringi ketukan penggaris kayu ke dinding yang sangat akrab di telinga setiap mahasiswa: irama ketukan khas almarhum Profesor Broto, dosen pembimbing skripsi angkatan sembilan puluhan yang konon meninggal saat lembur memeriksa disertasi mahasiswa."
    ]
  ),
  c(
    2,
    "Kepanikan Ospek Malam di Lorong Gedung C",
    "Midnight Orientation Panic in Building C",
    [
      "Malam keakraban mahasiswa baru angkatan anyar seharusnya menjadi ajang pamer wibawa para senior himpunan dengan muka ditekuk sok sangar dan suara dibikin berat. Anton yang malam itu bertugas sebagai koordinator seksi keamanan merasa gagah mengenakan rompi hitam bertuliskan 'KOMDIS' sambil menenteng megafon pengeras suara yang tombol sirenenya sudah macet.",
      "Namun keangkuhan itu lenyap tanpa sisa ketika Miko, sekretaris panitia yang mengurus presensi, menghampiri posko dengan wajah seputih kertas hvs tujuh puluh gram. Di lembar presensi manual yang ditandatangani mahasiswa baru pada sesi jelajah malam pukul dua belas, terdapat satu tanda tangan basah dengan tinta biru pudar bertuliskan nama: 'Bambang Sudibyo, NIM 94-0123-Elektro'.",
      "'Ko, lu jangan gila ya! Angkatan sembilan empat itu zamannya kaset pita dan jaket jeans belel, anak ini sekarang minimal udah punya cucu!' semprot Anton setengah berbisik agar tidak memicu keributan di hadapan puluhan mahasiswa baru yang sedang duduk sila di lapangan rumput.",
      "Miko menyodorkan lembar daftar hadir dengan tangan gemetar. Di samping tanda tangan itu tertulis nomor kamar barak: Gedung C Ruang 103, sebuah ruangan bekas gudang peralatan panggung teater yang sudah digembok rantai kapal sejak dekade lalu karena lantainya ambles.",
      "Mau tak mau, Anton, Miko, dan Rendy harus memeriksa ruangan tersebut demi memastikan tidak ada mahasiswa baru yang usil atau tersesat ke dalam gedung tua yang terkenal angker itu. Dengan langkah berat dan hati mencelos, ketiganya berjalan menyusuri lorong Gedung C yang diterangi lampu neon berkedip-kedip menyeramkan."
    ],
    [
      "Begitu mereka mendekati pintu Ruang 103, gembok rantai kapal yang seharusnya mengunci pegangan pintu terlihat sudah teronggok di lantai dalam keadaan putus bersih, seperti dipotong menggunakan gunting baja berkekuatan hidrolik. Suara gumaman pelan sayup-sayup terdengar dari dalam, melafalkan lirik mars kampus versi lama yang sudah tidak pernah diajarkan sejak era reformasi.",
      "Rendy memberanikan diri mendorong daun pintu kayu jati yang lapuk itu dengan ujung tongkat sapu. Di tengah ruangan yang beraroma lumut basah, tampak seorang pemuda kurus berjaket almamater model kancing kuningan duduk membelakangi mereka di atas bangku kuliah kayu tanpa sandaran, sibuk membolak-balik lembar kalkulus bersampul karton cokelat.",
      "'Dek... maaf, acara jurit malam kumpulnya di lapangan tengah, bukan di sini...' tegur Anton berusaha menjaga intonasi suaranya agar tetap terdengar seperti komandan disiplin yang berwibawa meski bulu kuduknya sudah berdiri tegak.",
      "Sosok itu berhenti membalik halaman. Tanpa membalikkan tubuhnya, kepalanya berputar seratus delapan puluh derajat ke belakang menghadap ketiga senior itu dengan senyum lebar yang memperlihatkan deretan gigi hitam runcing, sementara matanya hanya berupa rongga gelap berongga tanpa pupil.",
      "'Kak... rumus turunan parsial saya salah di baris ketiga, bisa tolong diajarin sampai selesai?' bisik sosok itu dengan suara serak bergema dari empat penjuru dinding sekaligus, membuat Anton dan Miko spontan melempar megafon lalu lari tunggang langgang menabrak pintu darurat sambil membaca doa makan dan doa tidur bercampur aduk."
    ]
  ),
  c(
    3,
    "Penunggu Perpustakaan Tua yang Doyan Baca",
    "The Bookish Guardian of the Old Library",
    [
      "Ruang tandon skripsi di lantai bawah tanah perpustakaan pusat kampus adalah tempat paling membosankan sekaligus paling menyeramkan di seluruh universitas. Cahaya matahari tidak pernah sanggup menembus jendela ventilasi sempit berlapis kawat nyamuk yang tertutup jelaga knalpot bus kota, menciptakan hawa dingin abadi yang membekukan jemari siapa pun yang nekat berlama-lama di sana.",
      "Rendy terpaksa mengasingkan diri ke sarang debu tersebut karena seluruh meja di lantai atas sudah dipenuhi pasangan mahasiswa baru yang pura-pura belajar kelompok padahal cuma pacaran sambil menghabiskan kuota wifi gratis kampus. Dengan tumpukan bundel skripsi bersampul kulit imitasi hitam tahun 1980-an di hadapannya, Rendy membenamkan kepalanya di atas meja berusaha memahami metodologi regresi linier berganda yang bikin kepalanya serasa mau pecah.",
      "Rasa kantuk yang teramat sangat akhirnya mengalahkan tekad akademisnya. Menjelang magrib, ketika petugas perpustakaan biasanya mulai mematikan sakelar lampu baris demi baris, Rendy tertidur pulas dengan beralaskan draf proposal skripsinya yang baru selesai dicetak separuh.",
      "Ia terbangun sekitar pukul delapan malam dalam kegelapan total, hanya diterangi sinar rembulan pucat yang menyelinap dari kisi-kisi ventilasi atas. Namun bukan kegelapan yang membuat jantungnya copot, melainkan suara gesekan pena bolpoin di atas kertas tepat di samping telinganya: sret... sret... sret...",
      "Di bangku sebelah, seorang pria tua berkemeja safari abu-abu dengan kacamata berbingkai tanduk tebal sedang duduk tekun membaca proposal skripsi milik Rendy, memegang pulpen bertinta merah darah yang terus menari-nari di atas lembar bab tiga."
    ],
    [
      "Rendy membeku di tempatnya, menahan napas sampai dadanya terasa sesak. Keringat dingin mengucur deras di pelipisnya saat ia menyadari bahwa kaki pria tua itu tidak menapak ke lantai semen melainkan melayang sekitar sepuluh sentimeter di udara, diselimuti kabut putih tipis beraroma kapur tulis dan tembakau pipa belanda.",
      "'Metodologimu ceroboh sekali, anak muda,' tegur sosok itu tanpa menoleh, suaranya terdengar jernih seperti rekaman radio piringan hitam zaman kemerdekaan. 'Populasimu tiga ratus orang tapi sampel yang kamu ambil cuma dua puluh lima tanpa uji homogenitas varians. Dosenmu zaman sekarang kenapa malas sekali mengajarkan kaidah statistika yang benar?'",
      "Alih-alih histeris atau melompat kabur, otak Rendy yang sudah korslet karena stres skripsi mendadak merespons secara luar biasa pragmatis. 'A-anu, Mbah... eh, Bapak... dosen pembimbing saya sibuk jadi staf ahli kementerian, bimbingan cuma disuruh kirim email tapi nggak pernah dibalas-balas,' cicit Rendy dengan suara tercekat.",
      "Mendengar keluhan itu, sang penunggu perpustakaan menghela napas panjang yang terdengar seperti tiupan angin malam di puncak gunung. Ia meletakkan pena merahnya lalu menarik satu bundel skripsi tebal dari rak tandon baris kelima nomor arsip 1982 dan membukanya di hadapan Rendy.",
      "'Buka halaman seratus empat puluh dua. Salin model matriks kovarians di sana untuk memperbaiki bab tiga kamu. Kalau minggu depan kamu belum sidang juga, saya yang akan datang sendiri ke ruang dosenmu untuk melempar asbak ke mukanya!' tegas sang hantu sebelum lenyap perlahan menyatu ke dalam lemari arsip, meninggalkan draf skripsi Rendy yang kini penuh coretan koreksi bertinta merah rapi lengkap dengan paraf bernilai A."
    ]
  ),
  c(
    4,
    "Lift Rusak Jam Nol-Nol",
    "The Broken Midnight Elevator",
    [
      "Di gedung rektorat lantai delapan, lift nomor dua sudah lama memiliki reputasi buruk yang legendaris di kalangan petugas kebersihan dan mahasiswa pecinta alam. Di dinding pintunya terpasang stiker peringatan kuning terang bertuliskan 'RUSAK - SEDANG DALAM PERBAIKAN', namun setiap kali jarum jam dinding bergeser ke angka dua belas malam, lift tersebut kerap berdentang sendiri dan meluncur turun menjemput penumpang tak kasat mata.",
      "Sarah, mahasiswi tingkat akhir jurusan ilmu komunikasi yang baru selesai rapat evaluasi festival kampus, terlalu lelah untuk menuruni delapan lantai tangga darurat yang gelap gulita. Ketika pintu lift nomor dua mendadak berdenting terbuka dengan lampu kabin menyala terang benderang dan aroma pendingin udara yang sejuk menyegarkan, logika kehati-hatiannya seketika kalah oleh rasa pegal di kedua betisnya.",
      "Tanpa berpikir panjang, Sarah melangkah masuk ke dalam kabin lift berlapis cermin baja tahan karat tersebut. Pintu menutup rapat dengan bunyi klik pelan, dan Sarah menekan tombol 'Lantai 1' dengan perasaan lega membayangkan empuknya kasur kosan yang sudah menunggunya.",
      "Namun lift tidak meluncur turun melainkan diam tak bergerak di tempat, sementara lampu indikator nomor lantai di atas pintu mulai berputar acak menampilkan angka-angka aneh: 0... -1... -4... hingga berhenti pada simbol huruf Yunani kuno yang tak pernah terdaftar dalam denah gedung kampus mana pun.",
      "Suhu di dalam kabin mendadak anjlok drastis hingga napas Sarah menghembuskan uap putih pekat. Lampu neon di langit-langit berkedip tiga kali sebelum padam total, menyisakan kegelapan pekat yang membungkam seluruh indranya."
    ],
    [
      "Ketika lampu darurat berwarna merah temaram menyala redup, Sarah menatap pantulan dirinya di cermin dinding kabin. Namun ada yang salah dengan bayangan itu: di belakang tubuhnya, cermin memantulkan belasan orang berbaju putih lusuh berdiri berdesak-desakan dengan wajah pucat tanpa mata, semuanya menunduk kaku menatap ujung sepatu mereka.",
      "Sarah menahan jeritan sekuat tenaga sambil menekan tombol darurat berulang kali secara membabi buta. Bunyi bel darurat melengking nyaring memecah keheningan malam, tetapi kabin lift terus bergetar hebat diiringi suara derit kabel baja yang meregang seperti hendak putus.",
      "Salah satu sosok di dalam cermin—seorang perempuan berambut panjang basah dengan kalung kartu mahasiswa bertarikh tahun 1998—perlahan mengangkat kepalanya. Ia mencondongkan wajahnya ke telinga Sarah dan berbisik sangat pelan: 'Mbak... tolong titip absen ya, kelas Pengantar Filsafat jam tujuh pagi jangan sampai saya kena alfa lagi...'",
      "Sarah yang panik luar biasa spontan merogoh tas ranselnya, mengeluarkan kartu rencana studi miliknya sendiri dan menyodorkannya ke arah bayangan cermin dengan tangan bergetar hebat: 'Nih Mbak! Ambil aja KRS saya sekalian gantiin saya skripsi! Saya ikhlas dunia akhirat!'",
      "Mendengar tawaran skripsi itu, sosok hantu perempuan tersebut tampak tersentak kaget, melangkah mundur dua langkah dengan ekspresi ngeri yang sangat manusiawi, sebelum lift mendadak berhenti dengan sentakan keras dan pintu terbuka lebar di lantai dasar rektorat, memperlihatkan Pak Satpam yang bengong menatap Sarah yang keluar sambil terengah-engah memeluk tasnya erat-erat."
    ]
  ),
  c(
    5,
    "Kantin Hantu dan Mi Instan Tengah Malam",
    "The Ghost Canteen and Midnight Instant Noodles",
    [
      "Kantin Sastra di sudut barat kampus pada siang hari adalah surga kuliner murah meriah tempat berkumpulnya aktivis senja, penyair kampus gadungan, hingga pemburu gorengan hangat bersubsidi. Namun saat malam tiba dan gerbang kampus digembok rapat, warung-warung seng di kantin itu berubah menjadi deretan stan sunyi yang lembap dan berbau minyak jelantah sisa penggorengan siang.",
      "Anton dan Rendy yang kelaparan parah sehabis begadang menyusun kuesioner penelitian nekat menyusup ke area kantin dengan harapan warung kopi Mbok Darmi masih menyisakan beberapa bungkus biskuit atau sisa pisang goreng di etalase kaca. Perut mereka sudah berbunyi seperti orkestra dangdut yang menuntut pasokan karbohidrat darurat.",
      "Anehnya, ketika mereka menginjakkan kaki di pelataran kantin yang becek, aroma sedap tumisan bawang merah dan kaldu ayam mendadak tercium sangat kuat menguar dari warung nomor tujuh di ujung deretan. Lampu teplok minyak tanah tampak menyala hangat di balik tirai kain blacu lusuh yang berkibar ditiup angin malam.",
      "'Gila, Mbok Darmi lembur bikin pesanan nasi kotak dosen ya jam segini?' gumam Anton dengan mata berbinar-binar penuh harapan sambil mempercepat langkahnya menuju warung tersebut.",
      "Rendy yang berjalan di belakangnya merasakan firasat ganjil: tidak ada suara kompor gas berdesis atau denting wajan yang biasa mengiringi aktivitas memasak, hanya ada aroma kuah kaldu yang kelewat harum dan sunyi yang menusuk gendang telinga."
    ],
    [
      "Anton tanpa ragu menyingkap tirai kain blacu warung itu dan berseru ceria: 'Mbok! Mi instan dobel rebus kuah pedas telor setengah matang dua porsi ya, utang dulu catat di bon minggu depan!'",
      "Di balik meja saji kayu panjang, seorang wanita tua bertubuh bungkuk dengan sanggul miring sedang mengaduk panci enamel besar berisi kuah mengepul hitam pekat. Ketika wanita itu membalikkan wajahnya, Anton dan Rendy membeku di tempat: wajah wanita itu rata tanpa mata, hidung, maupun mulut, hanya berupa kulit keriput berwarna abu-abu semen.",
      "Dari permukaan panci yang diaduk perlahan oleh wanita itu, mengapung serpihan-serpihan kertas fotokopian kartu ujian bertuliskan nilai D dan E, bercampur butiran kapur barus serta rambut hitam panjang yang menggulung seperti mie keriting.",
      "'Mau nambah sawi atau sambal terasi, Nak?' sebuah suara perempuan tua mendadak terdengar langsung di dalam kepala kedua mahasiswa itu, bukan melalui udara melainkan melalui getaran pikiran yang membuat ubun-ubun mereka berdenyut ngilu.",
      "Anton menelan ludah susah payah, lalu dengan kesopanan luar biasa khas anak rantau yang takut kualat menjawab pelan: 'Nggak usah Mbok... makasih banyak, kami mendadak kenyang ingat dosa... permisi numpang lewat ya Mbok!' Keduanya lalu mundur perlahan tiga langkah sebelum berbalik dan lari sprint seratus meter memecahkan rekor pekan olahraga mahasiswa menuju pos satpam terdekat."
    ]
  ),
  c(
    6,
    "Misteri Dosen Penguji dari Masa Silam",
    "The Mysterious Examiner from the Past",
    [
      "Hari sidang skripsi seharusnya menjadi puncak pencapaian akademis yang penuh kebanggaan, namun bagi Miko, hari itu terasa seperti pengadilan pidana tanpa pengacara pembela. Jadwal sidangnya ditempatkan pada sesi terakhir pukul empat sore di Ruang Sidang Utama lantai dua gedung dekanat lama yang hawanya selalu pengap dan murung.",
      "Dua dosen penguji sudah duduk di meja depan dengan tumpukan berkas dan raut wajah bosan khas akademisi senior yang ingin lekas pulang menghindari kemacetan jam sibuk ibu kota. Dosen pembimbing Miko melirik jam tangannya berkali-kali sambil mengetuk-ngetukkan jari ke meja kayu jati yang mengilap.",
      "'Penguji ketiga belum datang juga,' gumam Ketua Penguji sambil memeriksa daftar undangan sidang. 'Di jadwal tertera Dr. Ir. Hartono Soebroto, tapi beliau kan sudah pensiun tahun sembilan puluh tujuh lalu pindah ke Belanda... siapa panitia bodoh yang mencantumkan nama beliau di sistem sim-akademik?'",
      "Tepat pukul empat lewat tiga puluh menit, ketika hujan deras mulai mengguyur atap seng gedung dan petir menyambar di kejauhan, pintu ruang sidang terketuk tiga kali dengan ketukan yang sangat mantap dan berwibawa.",
      "Pintu terbuka perlahan menampakkan seorang pria paruh baya berjas wol kelabu model kuno dengan dasi kupu-kupu hitam dan tas koper kulit cokelat bermerek dagang era kolonial. Ia melangkah masuk tanpa alas kaki bersuara, membawa hawa dingin lembap yang membuat kedua dosen penguji di depan spontan bangkit berdiri dengan tatapan terpaku penuh takzim dan kebingungan."
    ],
    [
      "Pria itu duduk santai di kursi penguji ketiga tanpa mengucap sepatah kata pun. Ketika ia membuka map naskah skripsi Miko dengan jemari pucat bertulang ramping, aroma dupa melati dan kertas stensil tua seketika memenuhi ruang sidang yang ber-AC dingin itu.",
      "'Saudara Miko,' suara pria itu terdengar sangat tenang namun memiliki daya tekan psikologis yang luar biasa, seolah setiap suku katanya menggetarkan fondasi ruangan. 'Kamu mengutip penelitian saya tahun 1983 tentang kestabilan lereng tanah liat di halaman empat puluh lima, tapi kamu salah mencantumkan rumus diferensial orde dua di persamaan nomor tujuh.'",
      "Miko yang berdiri di podium presentasi gemetaran hebat hingga pointer laser di tangannya menari-nari tak menentu di layar proyektor. Kedua dosen penguji lainnya terdiam seribu bahasa, tidak berani membantah atau menyela ucapan tamu misterius yang tatapan matanya begitu tajam menembus relung sanubari mereka.",
      "Selama empat puluh lima menit berikutnya, Miko dibantai habis-habisan mengenai kalkulasi mekanika tanah dengan ketelitian matematis yang luar biasa tinggi. Namun anehnya, setiap kali Miko hampir menyerah dan hendak menangis pasrah, sang dosen gaib justru memberikan petunjuk analogi fisika sederhana yang membuka jalan keluar bagi kebuntuan berpikirnya.",
      "Di akhir sesi, pria tua itu tersenyum tipis, menandatangani lembar berita acara kelulusan dengan tinta celup emas yang berkilau, lalu pamit keluar ruangan mendahului yang lain. Ketika Ketua Penguji memeriksa lembar tanda tangan tersebut, tanda tangan itu tertoreh indah atas nama Dekan Pertama Fakultas Teknik tahun 1965, sementara di lantai lorong luar ruangan hanya tertinggal jejak tapak basah bercampur kelopak bunga melati segar."
    ]
  ),
  c(
    7,
    "Kamera Trap UKM Fotografi",
    "The Photography Club's Camera Trap",
    [
      "Unit Kegiatan Mahasiswa Fotografi kampus sedang mengalami krisis karya untuk pameran tahunan bertema 'Misteri Sudut Urban'. Sarah, yang menjabat sebagai kurator pameran, mencetuskan ide gila yang disetujui secara aklamasi oleh seluruh anggota: memasang tiga unit kamera trap sensor gerak inframerah di tiga lokasi paling angker di kampus selama sepekan penuh.",
      "Lokasi pertama adalah terowongan pipa drainase bawah tanah di bawah gedung rektorat, lokasi kedua adalah pohon beringin tua dekat lapangan tenis, dan lokasi ketiga adalah kamar mandi lantai empat gedung fakultas hukum yang keran airnya konon sering menyala sendiri setiap malam Jumat Kliwon.",
      "Hari penarikan kartu memori kamera berlangsung penuh antusiasme di ruang gelap sekretariat UKM yang hanya diterangi lampu merah temaram. Puluhan anggota berkumpul mengerubungi laptop monitor resolusi tinggi untuk membedah ribuan jepretan otomatis yang tertangkap sensor sepanjang minggu.",
      "Pada kamera pertama di terowongan pipa, hasilnya cukup mengecewakan: hanya ada sembilan puluh persen foto kucing garong liar yang mengejar tikus got gotik berukuran jumbo. Pada kamera kedua di pohon beringin, hanya terekam bayangan dahan pohon yang bergoyang ditiup angin kencang serta sepasang mahasiswa pacaran yang terpotret kaget terkena kilatan lampu kilat malam hari.",
      "Namun ketika giliran kartu memori dari kamera ketiga dibuka, suasana di ruang sekretariat mendadak hening membisu seperti kuburan massal. Folder foto itu berisi ratusan jepretan foto berurutan bertarikh jam dua dini hari dengan subjek yang sama sekali tidak masuk akal dalam hukum optik kamera digital."
    ],
    [
      "Di frame foto bernomor DSC_4891, lensa kamera menangkap pantulan cermin wastafel kamar mandi yang menampakkan sesosok wanita berbaju merah marun sedang melayang menghadap cermin sambil menyisir rambut panjangnya yang terurai hingga menyentuh lantai basah.",
      "Di frame berikutnya bernomor DSC_4892, sosok wanita itu tampak berhenti menyisir. Ia menoleh perlahan ke arah kamera trap yang tersembunyi di balik ventilasi plafon, dengan seringai mengerikan yang memperlihatkan lidah menjulur panjang berlapis lendir hitam.",
      "Yang paling membuat darah semua mahasiswa di ruangan itu membeku adalah frame terakhir: foto tersebut berupa jepretan makro jarak super dekat yang diambil dari sudut pandang kamera ponsel milik Sarah sendiri, menampakkan seluruh anggota UKM yang sedang duduk melingkar di ruang sekretariat saat itu juga, difoto dari sudut langit-langit tepat di atas kepala mereka!",
      "Terdengar bunyi 'klik... whirrr...' pelan dari sudut plafon ruang sekretariat yang gelap, diiringi suara ketukan kuku panjang ke casing kayu ventilasi udara di atas mereka.",
      "'K-kak... kamera trap nomor empat siapa yang masang di atas kepala kita?' bisik seorang mahasiswa baru angkatan anyar dengan bibir bergetar hebat sambil menunjuk ke arah bayangan gelap yang merayap di langit-langit ruangan tepat di atas lampu merah kamar gelap."
    ]
  ),
  c(
    8,
    "Ritual Garam Kasar dan Doa Campur Aduk",
    "Coarse Salt Rituals and Mixed Prayers",
    [
      "Setelah insiden kamera trap dan teror lift rektorat yang semakin tak terkendali menjelang masa ujian akhir semester, kepanikan massal melanda penghuni kosan Melati Indah tempat Rendy dan Anton mengontrak. Hampir setiap malam penghuni kos diganggu ketukan pintu misterius, aroma melati basi di saluran pembuangan air, hingga penampakan jemuran seprai yang melayang sendiri di lantai jemuran atas.",
      "Anton yang panik memutuskan mengambil inisiatif spiritual darurat dengan berkonsultasi kepada pamannya di kampung yang konon pernah menjadi asisten dukun pasang susuk. Berdasarkan petunjuk sang paman lewat sambungan telepon bersuara kresek-kresek, mereka harus melakukan ritual pagar gaib menggunakan garam krosok kasar yang dibeli di pasar tradisional pada hari pasaran Wage.",
      "'Garam ini harus ditaburkan mengelilingi seluruh perimeter kamar sambil membaca doa penolak bala tujuh kali tanpa bernapas,' terang Anton dengan wajah serius seperti tabib sakti mandaraguna di depan Rendy dan Miko yang memegang mangkuk plastik berisi garam kasar.",
      "Masalahnya, Rendy hanya hafal ayat kursi separuh, Anton cuma hafal doa selamat versi tahlilan kampung, sedangkan Miko yang berasal dari sekolah swasta modern cuma bisa komat-kamit menghafal dalil logika silogisme aristoteles.",
      "Tepat pukul dua belas malam, operasi penyebaran garam kasar pun dimulai di lorong kosan yang remang-remang dengan formasi segitiga taktis: Anton di depan memegang mangkuk, Rendy di tengah memegang sapu lidi pemukul setan, dan Miko di belakang membawa lilin aromaterapi aroma lavender penghilang stres."
    ],
    [
      "Saat Anton menaburkan sejumput garam pertama di depan pintu kamar nomor lima yang terkenal paling angker, angin puyuh mendadak berputar kencang di lorong sempit kosan itu, meniup butiran garam kasar berhamburan tepat mengenai mata Anton sendiri hingga sang komandan menjerit kepedasan sambil mengucek matanya yang merah menyala.",
      "Di saat bersamaan, pintu kamar nomor lima mendadak terbuka perlahan dengan bunyi derit memilukan, mengeluarkan kabut putih pekat beraroma kemenyan bakar yang membuat alarm pendeteksi asap kosan berbunyi melengking nyaring memekakkan telinga.",
      "Dari dalam kabit itu merayap keluar sesosok makhluk bertubuh legam berbulu gimbal lebat dengan mata merah menyala sebesar bola tenis, mendesis galak menatap ketiga mahasiswa yang kini berdiri berpelukan erat di tengah lorong sempit.",
      "'Woi baca doanya cepat! Jangan doa selamat doang goblok!' jerit Rendy sambil mengayunkan sapu lidi ke udara secara panik tak beraturan.",
      "Anton yang matanya masih perih terkena garam sontak melafalkan apa pun teks hafalan yang melintas di kepalanya dengan nada sangat khusyuk: 'BISMILLAHIRRAHMANIRRAHIM... MAHA SUCI ALLAH DENGAN SEGALA FIRMAN-NYA... PASAL TIGA PULUH TIGA AYAT TIGA UNDANG-UNDANG DASAR BUMI DAN AIR DAN KEKAYAAN ALAM YANG TERKANDUNG DI DALAMNYA DIKUASAI OLEH NEGARA DAN DIGUNAKAN UNTUK SEBESAR-BESAR KEMAKMURAN RAKYAT!'",
      "Ajaibnya, mendengar pasal tiga puluh tiga UUD 1945 dilafalkan dengan nada histeris penuh keputusasaan, sosok makhluk halus raksasa itu tampak bingung kebingungan, menggaruk kepalanya yang berbulu lebat, lalu perlahan mundur masuk kembali ke dalam kamar dan menutup pintunya dengan sangat sopan."
    ]
  ),
  c(
    9,
    "Pemberontakan Arwah Kampus Lama",
    "The Revolt of the Old Campus Spirits",
    [
      "Malam menjelang batas akhir pengunggahan naskah skripsi ke portal wisuda nasional adalah malam paling bersejarah bagi angkatan Rendy. Namun universitas diguncang oleh kabar bahwa gedung dekanat lama dan perpustakaan arsip akan digusur rata dengan tanah mulai esok pagi untuk dijadikan gedung pusat bisnis dan hotel berbintang milik investor asing.",
      "Kabar penggusuran itu rupanya tidak hanya memicu demonstrasi ratusan aktivis mahasiswa berjaket almamater di depan gerbang utama, melainkan juga menyulut kemarahan besar penghuni tak kasat mata dari seluruh pelosok kampus lama yang terancam kehilangan tempat bernaung mereka.",
      "Tepat pukul sebelas malam, fenomena aneh berskala kampus terjadi serentak: ribuan buku di perpustakaan lama melayang keluar jendela membentuk formasi burung camar raksasa di langit malam, lampu-lampu taman menyala membentuk tulisan protes berukuran raksasa di lapangan rumput, sementara bunyi gamelan mistis bertalu-talu menggelegar dari aula kesenian yang terkunci rapat.",
      "Rendy, Sarah, Anton, dan Miko yang terjebak di laboratorium komputer rektorat demi mencetak berkas lembar pengesahan terakhir menyaksikan bagaimana deretan kursi kuliah di lorong bergerak mandiri membentuk barikade perlawanan menghadang buldoser kontraktor yang sudah terparkir di pelataran parkir.",
      "'Mereka... mereka lagi demo bareng kita, Ren!' bisik Sarah dengan mata terpana menatap rombongan bayangan arwah mahasiswa lintas angkatan yang berbaris rapi membawa spanduk kain putih bertuliskan tinta gaib: 'TOLAK KOMERSIALISASI RUANG BELAJAR RAKYAT!'"
    ],
    [
      "Ketika mandor kontraktor dan sekelompok preman bayaran berusaha menerobos barikade gerbang dengan linggis dan rantai besi, arwah Profesor Broto bersama hantu penunggu lab anatomi berdiri tegak di barisan terdepan dengan aura biru kemilau yang memancarkan wibawa keilmuan yang tak terbendung.",
      "Buldoser yang dinyalakan mendadak macet total saat arwah para mantan asisten laboratorium meniupkan partikel embun dingin ke saluran mesin bensin, membuat mesin berat tersebut mati total disertai letupan asap putih beraroma melati segar.",
      "Rendy yang menyaksikan momen bersejarah itu tersadar bahwa selama ini, para arwah penunggu kampus bukanlah monster jahat pemangsa manusia, melainkan manifestasi dari memori kolektif, dedikasi keilmuan, dan cinta tak bersyarat generasi terdahulu kepada almamater yang kini hendak diperjualbelikan demi profit segelintir pejabat kampus.",
      "Dengan keberanian yang lahir dari rasa kebersamaan yang mendalam, Rendy dan kawan-kawannya melangkah maju bergabung di samping barisan entitas tak kasat mata itu, menyalakan lilin perdamaian dan menyanyikan lagu Gaudeamus Igitur bersama-sama hingga suara mereka menggema membelah malam perbukitan kampus.",
      "Melihat gabungan ribuan mahasiswa hidup dan arwah leluhur kampus yang bersatu padu dalam solidaritas tanpa batas dimensi, pihak rektorat yang menyaksikan dari menara lantai delapan akhirnya luluh dan menandatangani surat pembatalan penggusuran di hadapan notaris malam itu juga."
    ]
  ),
  c(
    10,
    "Wisuda Lintas Alam dan Perpisahan yang Manis",
    "Interdimensional Graduation and a Sweet Farewell",
    [
      "Hari wisuda akbar di auditorium megah kampus akhirnya tiba, mengakhiri perjalanan berliku selama tujuh tahun masa studi yang penuh drama darah, air mata, dan teror supranatural. Rendy, Anton, Miko, dan Sarah duduk berdampingan di barisan kursi wisudawan fakultas sains dengan toga hitam pekat dan topi toga bersegi empat yang terpasang miring di kepala Anton.",
      "Udara auditorium berhawa sejuk pendingin ruangan, dipenuhi keharuman rangkaian bunga ucapan selamat dari sanak famili dan suara riuh rendah obrolan ribuan orang tua wisudawan yang bangga melihat putra-putri mereka akhirnya bergelar sarjana.",
      "Ketika nama Rendy dipanggil oleh pembawa acara dengan mikrofon gema menggelegar: 'Rendy Pratama, Sarjana Sains, Predikat Sangat Memuaskan', seisi ruangan bertepuk tangan meriah. Rendy melangkah mantap menaiki tangga panggung kehormatan menuju meja Rektor untuk pemindahan tali kuncir toga.",
      "Namun di samping meja Rektor, di antara deretan guru besar berjubah sutra merah marun, Rendy melihat tiga sosok berpenampilan khusus yang tidak kasat mata bagi mata orang awam: Profesor Broto tersenyum hangat mengenakan toga kebesaran berbahan beludru antik, wanita tua penunggu warung kantin melambaikan tangan dengan wajah ramah berseri-seri, dan sosok mahasiswa angkatan sembilan puluh empat berdiri tegak memberi hormat militer dengan bangga.",
      "Rektor tersenyum menyalami Rendy sambil memindahkan kuncir toganya dari kiri ke kanan. 'Selamat ya, Nak Rendy. Skripsi kamu tentang jamur anaerob gedung lama dinilai dewan juri sebagai karya orisinal terbaik tahun ini... walaupun catatan kaki di bab tiga kamu gayanya mirip sekali dengan tulisan almarhum Profesor Broto.'"
    ],
    [
      "Rendy hanya tersenyum simpul sambil membungkuk hormat penuh ketulusan, menatap lurus ke arah arwah sang profesor yang mengacungkan jempol jemarinya yang bercahaya keemasan di samping podium.",
      "Seusai upacara, di pelataran taman rektorat yang dinaungi pohon flamboyan berbunga merah menyala, keempat sekawan itu berfoto bersama melempar topi toga mereka tinggi-tinggi ke langit biru cerah yang bersih tanpa awan gelap.",
      "Ketika foto hasil jepretan kamera instan itu keluar dan gambarnya mulai mengering dalam hitungan detik, mereka melihat sebuah pemandangan yang membuat air mata haru menetes di pipi masing-masing wisudawan.",
      "Di dalam lembar foto Polaroid berbingkai putih itu, tidak hanya ada mereka berempat yang tersenyum riang merangkul pundak satu sama lain, melainkan juga puluhan sosok transparan yang tersenyum damai mengelilingi mereka, ikut berpose mengacungkan tanda dua jari perdamaian di bawah naungan pohon flamboyan kampus.",
      "Kampus tua itu kini bukan lagi tempat yang menakutkan, melainkan rumah kedua yang menyimpan persahabatan abadi melintasi batas ruang dan waktu: sebuah bukti nyata bahwa selama akal budi, integritas, dan rasa kemanusiaan tetap dijunjung tinggi, tak ada kegelapan yang sanggup memadamkan cahaya obor ilmu pengetahuan."
    ]
  )
];

console.log("Writing Ghost Back to Campus finished, count:", ghostChapters.length);
