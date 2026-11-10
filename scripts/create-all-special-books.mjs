import fs from "fs";
import path from "path";
import { ghostChapters } from "./generate-special-complete.mjs";

function c(num, titleId, titleEn, p1, p2) {
  const text1 = p1.map((s) => s.trim()).join("\n\n");
  const text2 = p2.map((s) => s.trim()).join("\n\n");
  return {
    chapterNumber: num,
    titleId,
    titleEn,
    contentId: `${text1}\n\n<!-- pagebreak -->\n\n${text2}`,
    contentEn: null,
    audioUrl: null,
    audioDurationSec: null,
  };
}

// Kematian Kedua chapters
const kematianChapters = [
  c(
    1,
    "Mimpi yang Menolak Selesai",
    "A Dream That Refuses to End",
    [
      "Malam itu kabut tebal merangkak turun dari lereng Gunung Wayang, menyelubungi atap genteng sirap paviliun tua keluarga yang telah berdiri sunyi selama hampir satu abad. Arya berdiri di beranda lantai dua sambil memutar lensa fokus kamera analog tua warisan pamannya, menatap hamparan kebun teh yang tampak seperti lautan hitam berombak di bawah guyuran cahaya rembulan perak.",
      "Pamannya, Raden Danurdoro, meninggal dua pekan lalu dalam keadaan yang menyisakan tanda tanya besar bagi warga desa sekitar. Di kamar kerjanya yang terkunci rapat dari dalam, pria sepuh yang menghabiskan paruh hidupnya meneliti arsip agraria kolonial itu ditemukan terbujur kaku di kursi goyangnya, dengan kedua mata terbuka menatap langit-langit dan jemari tangan mencengkeram erat sebuah amplop berlak merah.",
      "Sebagai keponakan tertua sekaligus fotografer forensik arsitektur, Arya adalah satu-satunya kerabat yang bersedia datang mengurus paviliun terpencil ini. Kerabat yang lain menolak menginjakkan kaki di tanah perkebunan Cikawung, seolah ada kutukan tak terucap yang membuat nama keluarga mereka tabu untuk dibicarakan di perkumpulan keluarga besar di kota.",
      "Di dalam amplop berlak merah itu tersimpan sepucuk surat bertinta hitam dengan tulisan tangan pamannya yang bergetar: 'Kematian pertama seorang manusia terjadi saat napasnya berhenti dan jasadnya diserahkan kembali kepada tanah. Tetapi kematian kedua—kematian yang sesungguhnya—baru tiba saat namanya dihapus dari seluruh memori manusia yang masih hidup.'",
      "Tepat saat jarum jam dinding antik di aula berdentang tiga kali menandakan fajar yang masih jauh, angin kencang berhembus membuka paksa jendela beranda. Dari arah rumpun teh di bawah sana, samar-samar terdengar suara lembut seorang perempuan yang memanggil nama Arya dengan nada sendu yang begitu akrab di telinganya."
    ],
    [
      "Arya mencondongkan tubuhnya ke bibir pagar beranda kayu yang berderak rapuh. Di tengah gulungan kabut yang bergerak seperti selendang putih, ia melihat sesosok perempuan mengenakan kebaya katun putih model kuno dan kain batik parang rusak sedang berdiri mematung di antara deretan perdu teh, menengadahkan wajahnya lurus ke arah Arya.",
      "Rasa penasaran mengalahkan rasa ngerinya; Arya mengangkat kameranya, mengintip melalui jendela bidik optik dan menekan tombol rana: klik... whirrr. Kilatan lampu kilat menerangi malam selama sepersekian detik, memperlihatkan wajah perempuan itu yang seputih kapur tohor dengan tatapan mata kosong yang memancarkan kepedihan abadi.",
      "Namun ketika bayangan lampu kilat memudar, sosok itu lenyap begitu saja dari kebun teh, meninggalkan selembar kain selendang sutra hijau lumut yang tersangkut di pucuk dahan teh paling depan. Udara di beranda mendadak berubah menjadi sangat dingin hingga kaca jendela di belakang Arya berembun tebal dari sisi dalam.",
      "Di atas permukaan kaca yang berembun pekat itu, sebuah tulisan muncul perlahan seperti digoreskan oleh jari yang tak kasat mata: 'Jangan biarkan mereka membakar buku register panen tahun enam puluh lima...'",
      "Arya terhuyung mundur menabrak pintu beranda, menyadari bahwa misteri kematian pamannya bukan sekadar perkara medis serangan jantung orang tua, melainkan bagian dari persekongkolan kelam masa lalu yang menolak dikubur bersama tanah perkebunan teh ini."
    ]
  ),
  c(
    2,
    "Surat Warisan dari Desa yang Hilang",
    "The Testament of the Vanished Village",
    [
      "Keesokan paginya, Arya menuruni jalan terjal berbatu menuju balai desa di kaki lereng bukit untuk mencari informasi mengenai sejarah wilayah administratif perkebunan Cikawung. Matahari pagi yang pucat bersembunyi di balik kabut tebal yang tak kunjung terangkat, menyelimuti desa dengan kelembapan basah yang menusuk persendian tulang.",
      "Di warung kopi sederhana dekat jembatan gantung tua, obrolan warga paruh baya mendadak terhenti ketika Arya menanyakan arah jalan menuju perkampungan pemetik teh afdeling lima. Pak Lurah tua yang sedang menikmati ubi rebus menatap Arya dengan pandangan mata yang sulit diartikan: campuran antara rasa iba dan kecurigaan yang mendalam.",
      "'Nak Arya,' ujar Pak Lurah pelan sambil meletakkan cangkir sengnya. 'Di peta resmi kabupaten, afdeling lima dan desa Cikawung Kolot sudah dihapus sejak tahun 1968. Tidak ada lagi jalan ke sana, tanahnya sudah ditanami pohon kina dan pinus hutan lindung.'",
      "Namun Arya menunjukkan lembar peta cetak biru Belanda bertarikh 1928 yang ia temukan terselip di bawah karpet ruang kerja pamannya. Peta itu dengan sangat jelas menggambarkan pemukiman lebih dari seratus kepala keluarga pemetik teh lengkap dengan mushola kayu, pasar barter, dan kompleks pemakaman keluarga pekerja.",
      "Pak Lurah menghela napas panjang, merapatkan jaket lusuhnya seraya berbisik: 'Mereka tidak mati karena penyakit atau tanah longsor, Nak. Mereka dihapus... namanya dicabut dari catatan sipil, rumahnya dibakar hingga rata dengan tanah, dan siapa pun yang berani menyebut nama desa itu diancam cap pengkhianat negara.'"
    ],
    [
      "Arya meninggalkan warung itu dengan sejuta tanda tanya yang semakin menggelayuti benaknya. Ia memutuskan berjalan kaki menyusuri bekas rel lori perkebunan yang sudah tertutup semak belukar dan lumut kerak, mengikuti koordinat yang tertera pada peta peninggalan pamannya.",
      "Setelah berjalan selama dua jam menembus hutan pinus yang sunyi senyap, rel lori itu membimbingnya ke sebuah lembah tersembunyi di balik tebing cadas terjal. Di sana, di antara pepohonan teh liar yang tumbuh setinggi manusia, berderet sisa-sisa fondasi batu kali dari puluhan rumah panggung yang telah hangus menghitam dilalap api masa silam.",
      "Tidak ada suara serangga ataupun kicau burung di lembah mati itu; hanya ada keheningan mutlak yang menekan gendang telinga. Di tengah pelataran bekas balai pertemuan warga, sebuah tugu batu prasasti setinggi dua meter berdiri miring dengan tulisan nama-nama penduduk yang sengaja dipahat kasar dan dirusak dengan pahat baja.",
      "Arya berjongkok di dekat tugu itu, menyapukan jemarinya di atas aksara yang rusak tergerus waktu. Di bawah pahatan yang hancur, ia masih dapat mengeja satu baris kalimat pendek: 'Di sini bersemayam mereka yang dibungkam, menanti saat namanya kembali diucapkan oleh anak cucu bangsanya.'",
      "Tiba-tiba, dari balik semak belukar di tepi lembah, terdengar suara derak ranting kering yang patah terinjak langkah berat. Ketika Arya berbalik, ia melihat bayangan pria bertubuh kurus jangkung mengenakan topi caping anyaman bambu sedang berdiri mematung di kejauhan, mengacungkan tongkat penunjuk arah ke sebuah goa buatan di dinding tebing batu kapur."
    ]
  ),
  c(
    3,
    "Jejak Darah di Perkebunan Teh Tua",
    "Traces of Blood in the Old Tea Plantation",
    [
      "Goa di dinding tebing batu kapur itu ternyata merupakan bekas terowongan drainase air dan gudang penyimpanan cadangan amunisi era pendudukan Jepang. Hawanya lembap dingin menusuk hidung dengan bau belerang bercampur kotoran kelelawar dan lumut purba yang menempel tebal di dinding batu.",
      "Arya menyalakan senter berkekuatan seribu lumen, menyorot lorong batu yang menurun tajam ke perut bumi. Di lantai tanah liat yang becek, terlihat jejak roda lori berkarat yang mengarah ke sebuah ruangan berkubah di ujung terowongan yang dibatasi pintu jeruji besi kokoh.",
      "Di dalam ruangan berkubah itu teronggok puluhan peti kayu jati bersampul seng berkarat yang sudah dimakan rayap. Ketika Arya mencongkel salah satu tutup peti menggunakan linggis kecil, ia tidak menemukan emas batangan atau senjata api perang, melainkan ribuan bundel buku catatan harian, surat kabar stensil tahun 1960-an, dan kartu tanda anggota serikat buruh perkebunan.",
      "Halaman demi halaman koran stensil itu memuat tulisan tangan yang penuh gelora pemikiran tentang hak atas tanah garapan, upah layak pekerja daun teh, serta cita-cita kemerdekaan ekonomi rakyat jelata. Banyak di antara naskah tersebut yang dihiasi coretan puisi cinta dan sketsa potret keluarga yang digambar menggunakan arang bakar di atas kertas buram.",
      "Namun di beberapa lembaran kertas yang lebih tebal, bercak-bercak kecokelatan yang telah mengering selama puluhan tahun menutupi tulisan nama-nama anggota organisasi: bercak darah manusia yang menjadi bukti bisu dari pembantaian sunyi yang terjadi di malam pembersihan kelam tahun 1965."
    ],
    [
      "Saat Arya sedang memotret dokumen-dokumen berharga itu untuk arsip digital, tetesan cairan merah kental mendadak jatuh tepat di atas lensa kameranya: tik... tik... tik. Arya mendongakkan kepalanya ke arah langit-langit terowongan batu di atas kepalanya.",
      "Dari celah bebatuan langit-langit yang merekah, rembesan cairan merah tua mengalir lambat menetes ke bawah, sementara di celah yang sempit itu tampak puluhan jemari tangan pucat tanpa kuku sedang meraba-raba dinding batu seolah mencari jalan keluar dari kuburan terowongan yang disegel paksa.",
      "Suara gemuruh gaib mendadak terdengar bergetar dari dasar tanah, diiringi teriakan dan jeritan ratusan suara manusia yang bercampur baur memohon ampunan dan keadilan: 'Jangan kubur nama kami di sini! Kami bukan pengkhianat bangsa! Kami hanya petani yang menuntut hak atas tanah air sendiri!'",
      "Getaran hebat itu membuat dinding terowongan mulai runtuh berhamburan batu-batu tajam. Arya menyambar tas punggungnya yang sudah dipenuhi dokumen arsip penting dan berlari sekuat tenaga menuju mulut goa di tengah kepulan debu kapur yang membutakan pandangan.",
      "Ia berhasil melompat keluar ke pelataran kebun teh tepat saat mulut goa ambruk tertutup runtuhan batu kapur raksasa. Terengah-engah di atas rumput basah, Arya menatap ke arah reruntuhan itu dengan dada bergemuruh: ia kini mengerti mengapa pamannya bertahan puluhan tahun di paviliun sunyi ini; pamannya sedang menjaga memori orang-orang tak berdosa yang dipaksa mati dua kali oleh kezaliman sejarah."
    ]
  ),
  c(
    4,
    "Lukisan Dinding yang Bernapas",
    "The Breathing Mural",
    [
      "Kembali ke paviliun saat senja mulai temaram, Arya mendapati ruang perpustakaan utama di lantai dasar paviliun dalam keadaan acak-acakan. Lemari-lemari arsip kaca telah terbuka, dan ratusan berkas silsilah keluarga tercecer di atas lantai kayu ulin yang dingin.",
      "Namun perhatiannya seketika tersita oleh lukisan cat minyak berukuran raksasa di dinding tengah ruangan yang selama ini ditutupi kain beludru merah kusam. Kain penutup itu kini tergeletak di lantai, memperlihatkan lukisan pemandangan jamuan pesta perayaan panen raya teh tahun 1935 dengan sangat detail dan megah.",
      "Lukisan bergaya realisme Belanda itu menggambarkan puluhan bangsawan berpakaian safari putih dan gaun korset renda eropa sedang bersulang anggur di beranda paviliun. Sementara di latar belakang lukisan, ratusan buruh pemetik teh bertelanjang kaki berdiri berbaris di bawah terik matahari sambil menggendong bakul bambu yang melengkung berat.",
      "Yang membuat bulu kuduk Arya meremang adalah teknik pewarnaan kanvas tersebut: pigmen warna merah pada gaun para nyonya Belanda tampak berkilau basah seolah baru saja disapukan kuas beberapa menit yang lalu. Dan ketika Arya mendekatkan wajahnya untuk mengamati tanda tangan sang pelukis di sudut kanan bawah, ia mendengar suara tarikan napas halus yang teratur mengalir dari permukaan kanvas.",
      "Dada sosok mandor pribumi berkumis lebat di tengah lukisan itu tampak naik-turun secara ritmis, bernapas menghirup udara ruangan yang beraroma dupa dan kayu lapuk!"
    ],
    [
      "Arya mematung di tempatnya, menolak mempercayai apa yang disaksikan oleh kedua matanya sendiri. Ia mengangkat kamera analognya dan membidik lukisan tersebut dengan kecepatan rana tinggi demi memastikan fenomena ini bukan sekadar halusinasi visual akibat kelelahan mental.",
      "Saat tombol rana ditekan, kilatan lampu blitz menerangi seluruh ruangan. Melalui jendela bidik, Arya melihat pemandangan yang membuat jantungnya serasa berhenti berdetak: para tokoh di dalam lukisan itu mendadak menghentikan aktivitas makan minum mereka dan serentak menolehkan kepala mereka menatap tajam ke arah Arya!",
      "Senyum ramah di wajah para bangsawan di kanvas itu membusuk seketika menjadi seringai tengkorak berongga hitam, sementara cangkir anggur yang mereka pegang tumpah mengucurkan darah segar yang mengalir menetes turun dari bingkai lukisan ke lantai kayu ulin.",
      "Sosok mandor berkumis di kanvas itu perlahan melangkah maju, melepaskan dirinya dari bidang datar lukisan dua dimensi hingga separuh tubuhnya yang berlumuran lumpur perkebunan menonjol keluar ke ruang nyata: 'Tuan Muda Arya... kenapa baru sekarang kau datang menjemput kami? Nama kami sudah kedinginan di dalam kegelapan kanvas ini selama enam puluh tahun...'",
      "Arya melempar botol minyak cengkeh penangkal serangga ke arah sosok kanvas itu, memicu semburan api kecil yang membuat lukisan itu mengerang kesakitan dan menarik kembali tubuhnya ke dalam bidang gambar, meninggalkan ruangan dalam keheningan mencekam yang dipenuhi asap wangi dupa melati."
    ]
  ),
  c(
    5,
    "Catatan Harian yang Terbakar Separuh",
    "The Half-Burned Diary",
    [
      "Malam ketiga di paviliun Cikawung terasa semakin menekan kewarasan. Di tengah gemuruh badai petir yang mengguncang dinding-dinding kayu paviliun, Arya memutuskan memeriksa brankas besi peninggalan kakek buyutnya yang tersembunyi di balik perapian ruang makan.",
      "Kombinasi angka brankas berhasil ia tebak dari tanggal lahir sang kakek buyut yang tertera di nisan makam keluarga. Pintu besi tebal berderit terbuka, menampakkan sebuah kotak cerutu kayu eboni yang dilapisi kain sutra merah berlumur debu tebal.",
      "Di dalam kotak cerutu itu tersimpan sebuah buku harian bersampul kulit rusa dengan jahitan benang rami manual. Bagian tepi kanan buku harian itu tampak hangus menghitam bekas terbakar api bertahun-tahun silam, namun sebagian besar teks berbahasa Belanda campuran Melayu tinggi di dalamnya masih dapat dibaca dengan jelas menggunakan kaca pembesar.",
      "Catatan harian itu ditulis oleh kakek buyut Arya, Raden Mas Suryoatmodjo, pada bulan Oktober tahun 1965. Halaman-halaman awalnya mencatat transaksi jual beli daun teh dan dinamika persaingan pasar ekspor ke Eropa yang berlangsung normal layaknya catatan bisnis perkebunan lainnya.",
      "Namun memasuki catatan tanggal 18 Oktober 1965, gaya penulisan berubah drastis menjadi kalimat-kalimat pendek yang penuh ketakutan dan rasa bersalah yang tak tertanggungkan: 'Malam ini komandan peleton datang menuntut daftar lima puluh nama aktivis buruh pabrik teh. Jika aku menolak menyerahkan daftar itu, seluruh keluargaku diancam akan dihabisi di depan mata kepalaku sendiri...'"
    ],
    [
      "Arya membalik halaman berikutnya dengan jemari gemetar hebat. Di lembaran bertanggal 20 Oktober 1965, tertulis pengakuan memilukan dari kakek buyutnya: 'Aku terpaksa menuliskan nama-nama mereka di lembar serah terima militer... nama Kang Danu, Mbok Darmi, Mas Joko, dan puluhan anak muda yang biasa menyanyi bersamaku di kebun teh.'",
      "'Setelah mereka diangkut truk tentara ke arah jurang batu kapur, komandan itu memerintahkan seluruh dokumen kelahiran dan register kependudukan desa dibakar di tungku pabrik. Mereka ingin menghapus eksistensi orang-orang ini seolah mereka tidak pernah dilahirkan ke muka bumi ini.'",
      "'Inilah dosa abadi keluargaku. Kematian pertama jasad mereka adalah tanggung jawab moncong senjata tentara, tetapi kematian kedua jiwa mereka—dihapuskannya nama dan jejak kemanusiaan mereka—adalah dosa warisan yang akan mengikat keturunanku hingga ada yang berani menebusnya dengan kejujuran.'",
      "Tiba-tiba, lembaran buku harian di tangan Arya terasa memanas hebat. Tinta hitam tulisan tangan kakek buyutnya mulai mencair dan menetes seperti tetesan darah segar ke atas celana jins yang dikenakan Arya, diiringi suara isakan tangis pilu pria tua yang bergema dari sudut perapian yang dingin.",
      "Arya mendekap buku harian itu ke dadanya dan bersumpah di dalam batinnya: 'Eyang... aku tidak akan lari. Aku akan membawa nama-nama mereka kembali ke hadapan publik pembaca Indonesia, apa pun harga yang harus kubayar!'"
    ]
  ),
  c(
    6,
    "Bisikan di Sumur Tua Belakang Paviliun",
    "Whispers in the Old Well",
    [
      "Keesokan harinya pasokan air bersih dari pipa paralon pegunungan mendadak macet total. Karena persediaan air minum di dapur sudah menipis, Arya terpaksa menimba air dari sumur batu kuno yang berada di halaman belakang paviliun, tepat di bawah lindungan rimbun pohon beringin tua yang akarnya membelit dinding sumur.",
      "Sumur itu berdiameter dua meter dengan dinding batu kali berlumut tebal. Kedalamannya mencapai lebih dari dua puluh meter menembus lapisan akuifer bawah tanah yang airnya terkenal sangat jernih dan manis.",
      "Namun saat Arya melemparkan ember seng ke dalam sumur dan mulai memutar roda katrol timbangan, ia menyadari keanehan yang mencurigakan: suara jatuhnya ember ke permukaan air di bawah sana tidak menghasilkan bunyi cebur yang lazim, melainkan bunyi gemercik pelan yang diiringi desis uap panas.",
      "Ketika ember ditarik kembali ke atas, ember itu tidak berisi air bening pegunungan melainkan cairan kental berwarna merah kecokelatan yang beraroma amis darah bercampur wangi bunga melati busuk. Di dalam ember seng itu tersangkut seutas kalung perak berliontin foto bundar berkarat.",
      "Arya membersihkan kaca liontin itu dengan ujung bajunya: di dalam liontin itu terpasang foto seorang gadis muda berambut ikal dengan senyum manis mengenakan seragam guru sekolah desa era kemerdekaan."
    ],
    [
      "Suara gemercik air di dasar sumur mendadak berubah menjadi paduan suara bisikan halus ratusan orang yang berbicara saling bersahutan dari kedalaman lubang batu: 'Arya... tolong kami... air di sini sangat dingin dan sempit... sebutkan nama kami di hadapan dunia...'",
      "Dari bibir sumur batu yang basah, perlahan-lahan muncul jemari-jemari tangan pucat kurus yang merayap naik meniti dinding batu berlumut. Rambut hitam panjang yang terurai basah menyembul keluar dari kegelapan sumur, meliuk-liuk seperti tanaman air raksasa yang lapar.",
      "Sosok perempuan muda di dalam foto liontin itu melayang naik dari lubang sumur, mengenakan kebaya hijau lumut yang telah robek-robek compang-camping. Tatapan matanya yang teduh namun penuh luka menatap lurus ke relung sanubari Arya tanpa ancaman kekerasan, melainkan permohonan keadilan yang tak kunjung padam.",
      "'Namaku Siti Rohanah, Arya,' bisik sosok perempuan itu dengan nada yang merobek hati. 'Aku guru sekolah rakyat di desa Cikawung. Mereka membunuhku di tepi sumur ini saat aku menolak menyerahkan buku absensi murid-muridku. Sejak hari itu, tak ada seorang pun yang menyebut namaku dalam doa... aku telah mati untuk kedua kalinya di dasar sumur ini.'",
      "Arya menundukkan kepalanya dalam-dalam, menahan air mata yang mengaburkan pandangannya. 'Ibu Siti Rohanah... demi kehormatan seluruh guru dan pendidik bangsa ini, namamu tidak akan mati. Namamu akan terukir indah di dalam naskah pustaka rakyat ini untuk dibaca jutaan anak negeri!'"
    ]
  ),
  c(
    7,
    "Ketika Cermin Kehilangan Pantulan",
    "When Mirrors Lose Their Reflections",
    [
      "Teror psikologis yang dialami Arya mencapai puncaknya pada malam kelima isolasi di perkebunan berkabut itu. Cahaya lilin di kamar mandinya berkedip-kedip ditiup angin yang menyelinap dari celah ventilasi kayu jati.",
      "Ketika Arya mencuci mukanya dengan air dingin di wastafel porselen kuno, ia menatap cermin berbingkai ukiran kayu jati di hadapannya untuk menyeka wajahnya dengan handuk katun. Namun bayangan di cermin itu tidak mengikuti gerakannya: bayangan dirinya tetap berdiri tegak dengan mata melotot menatap ke arah Arya.",
      "Arya menghentikan tangannya, membeku di tempatnya dengan jantung berdegup kencang seperti genderang perang. Bayangan di cermin itu kemudian menyeringai dingin, melipat kedua tangannya di dada dengan ekspresi yang sangat angkuh dan asing.",
      "'Kau kira kau sedang menyelidiki sejarah masa lalu, Arya?' bayangan di dalam cermin itu berbicara dengan suara yang persis sama dengan suara Arya sendiri, namun memiliki nada sinis yang penuh racun kebencian. 'Kau datang ke sini hanya untuk memuaskan ego rasa penasaranmu sebagai fotografer kota yang sok berani.'",
      "'Kau tidak peduli pada orang-orang mati itu. Kau hanya ingin menyelesaikan proyek buku fotografimu demi meraih penghargaan kurator seni rupa di ibu kota!'"
    ],
    [
      "Arya menggelengkan kepalanya kuat-kuat, menolak tuduhan cermin psikologis yang berusaha meruntuhkan tekad moralnya. 'Tidak! Awalnya aku memang datang untuk mengurus warisan rumah ini, tapi setelah melihat ketidakadilan sejarah yang menimpa mereka, aku tidak bisa berpaling begitu saja!'",
      "Bayangan di cermin itu tertawa mengejek, suaranya menggelegar memantul di dinding ubin kamar mandi hingga cermin tersebut mulai bergetar retak membentuk jaring laba-laba halus. 'Lalu bagaimana dengan dosamu sendiri, Arya? Kau sendiri sudah bertahun-tahun tidak pernah mengunjungi pamanmu saat beliau sakit kesepian di paviliun ini!'",
      "'Kau sendiri yang membiarkan pamanmu mati perlahan dalam kesunyian tanpa keluarga! Bukankah kau juga telah membunuh pamanmu untuk kedua kalinya dengan melupakan eksistensinya di rumah tua ini?!'",
      "Tuduhan itu menusuk tepat ke titik terlemah rasa bersalah di dalam batin Arya. Air mata penyesalan menetes deras di pipinya, dan di saat bersamaan cermin di hadapannya pecah berkeping-keping berhamburan ke lantai ubin dengan suara denting kaca yang memekakkan telinga.",
      "Di setiap serpihan pecahan kaca yang berserakan di lantai, Arya tidak lagi melihat pantulan wajahnya sendiri, melainkan bayangan wajah almarhum pamannya yang sedang tersenyum damai menganggukkan kepala memberi pengampunan dan restu perjuangan."
    ]
  ),
  c(
    8,
    "Pertarungan Batin Melawan Bayangan Leluhur",
    "Inner Struggle Against Ancestral Shadows",
    [
      "Di ruang aula tengah paviliun yang diterangi puluhan lilin putih, Arya membentangkan seluruh dokumen register panen, foto-foto usang, dan catatan harian yang berhasil ia selamatkan di atas karpet permadani merah tua. Ia mulai mengetik naskah rekonstruksi sejarah tersebut menggunakan mesin tik manual peninggalan pamannya yang berdentik nyaring membelah sunyi malam.",
      "Namun entitas gelap yang selama enam puluh tahun memelihara kutukan pembungkaman di perkebunan Cikawung tidak tinggal diam membiarkan rahasianya dibongkar ke hadapan publik. Suhu ruangan anjlok drastis ke titik beku, dan bayangan-bayangan hitam setinggi plafon mulai merayap keluar dari sudut-sudut dinding kayu.",
      "Bayangan-bayangan itu berwujud sosok-sosok petinggi kolonial dan mandor kejam masa lalu dengan tatapan mata merah menyala penuh amarah. Mereka membawa tali gantungan, cap besi panas, dan tumpukan uang gulden berdarah untuk menyuap dan membungkam Arya.",
      "'Hentikan ketikanmu, anak muda!' bisik bayangan mandor besar dengan suara berat menggetarkan lantai. 'Jika kau mempublikasikan daftar nama ini, kehormatan nama keluargamu akan hancur lebur! Keluargamu akan dikenal selamanya sebagai trah pengkhianat buruh perkebunan!'",
      "'Biarkan masa lalu terkubur di bawah tanah teh! Demi kedamaian dan harta warisan paviliun ini, bakar saja dokumen itu dan nikmati seluruh kekayaan pamanmu di kota!'"
    ],
    [
      "Arya menatap bayangan-bayangan hitam raksasa itu tanpa berkedip sedikit pun. Jari-jarinya tetap menari lincah di atas tuts mesin tik tua, mengetikkan huruf demi huruf dari nama-nama para pemetik teh yang dibantai: 'Danu Sasmito... Darmi Suwarti... Kromo Pawiro...'",
      "'Kehormatan sejati tidak dibangun di atas tumpukan kebohongan dan pembungkaman sejarah!' seru Arya dengan suara lantang yang menggetarkan kaca-kaca jendela aula paviliun. 'Keluargaku memang telah berdosa di masa lalu, tetapi aku tidak akan mewarisi kepengecutan mereka!'",
      "'Kebenaran harus dibuka, bukan untuk membalas dendam dengan kebencian baru, melainkan agar bangsa kita tidak terus-menerus terjebak dalam lingkaran pembantaian dan pembungkaman saudara sebangsa!'",
      "Mendengar kata-kata kebenaran yang dilandasi keberanian moral murni itu, bayangan-bayangan hitam leluhur yang congkak tampak mengerang kepanasan seolah tersiram air mendidih. Cahaya lilin di aula yang semula temaram redup mendadak membesar menyala terang benderang dengan aura putih keemasan yang suci.",
      "Satu per satu bayangan hitam kegelapan itu luluh lantak menjadi asap kelabu yang terbang melayang keluar melalui cerobong perapian, meninggalkan aula paviliun dalam kehangatan damai yang belum pernah dirasakan selama puluhan tahun."
    ]
  ),
  c(
    9,
    "Malam Penebusan di Makam Keramat",
    "The Night of Redemption at the Sacred Ground",
    [
      "Malam Jumat Kliwon terakhir di bulan Syura menjadi puncak dari seluruh rangkaian perjalanan spiritual Arya di perkebunan teh Parahyangan. Bersama Pak Lurah dan beberapa tetua desa yang akhirnya berani membuka suara, Arya mendaki bukit tertinggi di balik perkebunan tempat makam massal tanpa nisan itu berada.",
      "Malam itu langit cerah bertabur jutaan bintang gemerlap tanpa sehelai kabut pun yang menghalangi. Di puncak bukit rumput yang menghadap ke hamparan lembah perkebunan yang luas, puluhan warga desa berkumpul membawa obor bambu dan tikar pandan untuk menggelar tahlilan doa bersama bagi arwah para pekerja yang terlupakan.",
      "Di hadapan gundukan tanah makam massal yang kini telah dibersihkan dari semak berduri, Arya berdiri memegang naskah kompilasi nama-nama warga Cikawung yang berhasil ia verifikasi dan ketik rapi setebal seratus halaman.",
      "Aroma wangi minyak cendana dan asap kemenyan yang dibakar di atas pedupaan tanah liat membubung tinggi ke angkasa malam, menyatu dengan lantunan ayat-ayat suci yang dibacakan para santri dengan suara merdu yang menggetarkan relung batin siapa pun yang mendengarnya.",
      "Arya melangkah ke depan lingkaran warga, membuka lembaran pertama naskahnya, dan mulai membacakan nama-nama para korban satu demi satu dengan suara yang jernih dan bergetar penuh rasa takzim."
    ],
    [
      "Setiap kali satu nama dan profesi dibacakan dengan lantang di puncak bukit itu: 'Siti Rohanah, guru desa... Pak Kromo, pemangkas teh... Dik Joko, pembawa air lori...', dari permukaan rumput makam muncul pendaran cahaya keemasan sebesar kunang-kunang yang perlahan membesar membentuk siluet sosok-sosok manusia transparan yang tersenyum damai.",
      "Warga desa yang menyaksikan pemandangan mistis yang agung itu tak kuasa menahan isak tangis haru. Mereka yang semula hidup dalam ketakutan puluhan tahun kini melihat dengan mata kepala sendiri bagaimana arwah kakek, nenek, dan paman mereka yang hilang akhirnya mendapatkan pengakuan dan doa kehormatan yang layak.",
      "Sosok Ibu Guru Siti Rohanah tampak berdiri paling depan di antara barisan cahaya arwah itu, memeluk erat liontin peraknya yang kini berkilau keemasan. Ia menganggukkan kepalanya dengan senyum penuh keikhlasan ke arah Arya, sebelum tubuhnya perlahan-lahan melayang naik menyatu ke dalam taburan bintang-bintang di angkasa raya.",
      "Seluruh beban kutukan, rasa dendam, dan penderitaan jiwa yang membelenggu tanah perkebunan teh Cikawung selama lebih dari setengah abad tuntas terangkat ke haribaan Sang Pencipta pada malam itu.",
      "Kematian kedua telah berhasil digagalkan: nama-nama mereka tidak lagi lenyap ditelan kegelapan sejarah, melainkan kini hidup abadi di dalam ingatan, cinta, dan doa seluruh masyarakat yang merdeka."
    ]
  ),
  c(
    10,
    "Kematian Kedua dan Lahirnya Fajar Baru",
    "The Second Death and the Dawn of Renewal",
    [
      "Fajar keesokan harinya merekah di ufuk timur dengan sapuan warna jingga keemasan yang luar biasa indah di atas hamparan permadani kebun teh Gunung Wayang. Udara pagi terasa sangat segar dan bersih, membawa aroma embun pegunungan dan keharuman pucuk-pucuk daun teh muda yang mulai bermekaran menyambut mentari.",
      "Paviliun tua peninggalan keluarga yang semula berhawa pengap dan angker kini bermandikan cahaya matahari pagi yang menembus jendela-jendela kaca besar di aula utama. Pintu dan jendela beranda terbuka lebar, mengalirkan hawa kehidupan baru ke seluruh sudut ruangan yang selama ini terpenjara dalam kegelapan.",
      "Arya duduk di meja kerja beranda depan sambil menikmati secangkir teh panas seduhan daun peko murni hasil petikan tangan warga desa pagi ini. Di samping cangkirnya tergeletak draf naskah buku cetak pertama yang akan diterbitkan oleh penerbitan rakyat AnzaBook, berjudul: 'Kematian Kedua: Rekonstruksi Memori dan Keadilan Tanah Cikawung'.",
      "Pak Lurah dan para pemuda desa datang membawa papan plakat kayu jati berukir yang akan dipasang di gerbang masuk perkebunan. Plakat itu bertuliskan nama resmi baru bagi kawasan tersebut: 'Taman Pustaka Sejarah & Hutan Kedaulatan Membaca Cikawung'.",
      "Anak-anak desa berlarian riang di pelataran rumput paviliun yang kini difungsikan sebagai lapak baca gratis untuk seluruh warga lereng bukit, membawa buku-buku cerita rakyat dan sains populer yang disalurkan melalui jaringan distribusi buku murah edisi rakyat."
    ],
    [
      "Sebelum mengemasi barang-barangnya untuk kembali ke kota menyerahkan naskah buku ke percetakan, Arya melangkah ke ruang perpustakaan utama paviliun untuk menatap lukisan dinding raksasa itu sekali lagi.",
      "Lukisan itu kini tampak berbeda sama sekali: tidak ada lagi aura kegelapan mistis atau tatapan kebencian di mata para tokohnya. Kanvas itu kini murni berupa karya seni sejarah bernilai tinggi yang menjadi saksi bisu perjalanan panjang bangsanya dari era kolonial menuju fajar kemerdekaan sejati.",
      "Arya menggantungkan kamera analognya di pundak, melangkah keluar pintu gerbang paviliun sambil melambaikan tangan kepada warga desa yang sedang bergotong royong merawat kebun teh peninggalan leluhur mereka.",
      "Di dalam hatinya terpatri satu pemahaman filosofis yang mendalam: Kematian biologis adalah keniscayaan alam yang tak dapat dihindari oleh setiap makhluk bernyawa. Namun kematian kedua—kehilangan martabat kemanusiaan dan terhapusnya nama dari ingatan peradaban—adalah bentuk penindasan yang wajib dilawan dengan karya, aksara, dan keberanian menegakkan kebenaran.",
      "Selama masih ada pena yang menuliskan fakta dan pembaca yang merawat ingatan dengan tulus, tak ada satu jiwa pun dari rakyat tertindas yang akan mati untuk kedua kalinya di bumi pertiwi."
    ]
  )
];

// Belum Ada Judul chapters
const belumAdaJudulChapters = [
  c(
    1,
    "Langkah Pertama di Bawah Naungan Selembar Awan",
    "The First Step Beneath a Fleeting Cloud",
    [
      "Anak Adam itu memulai pengembaraannya tepat saat kabut fajar baru saja tersibak dari punggung bukit karang purba di ujung selatan daratan. Ia melangkah tanpa membawa bekal peta navigasi satelit ataupun kompas berjarum magnetik; seluruh arah perjalanannya semata-mata dipandu oleh gerak perlahan selembar awan putih tipis yang berarak lembut di langit biru tak berbatas.",
      "Di bawah naungan bayang-bayang selembar awan yang teduh itu, udara panas padang gurun yang menyengat terasa sedikit bersahabat bagi telapak kakinya yang hanya beralaskan sandal kulit mentah sederhana. Setiap tapak langkah yang ia torehkan di atas debu jalanan seolah menjadi tanda tanya terbuka yang belum menemukan titik akhir jawaban.",
      "Mengapa manusia selalu tergesa-gesa memberi nama dan label pada segala sesuatu yang baru saja dijumpainya di dunia fana ini? Kita menamai gunung, menamai samudra, menamai bunga liar di tepi jurang, bahkan menamai kesedihan kita sendiri dengan istilah-istilah medis yang kaku demi menciptakan ilusi kepastian yang menenangkan kecemasan batin.",
      "Namun bagi sang musafir muda, kepastian sejati justru bermula saat akal budi berani melepaskan seluruh prasangka dan nama-nama yang dipaksakan oleh peradaban. Ia ingin menyusuri lekuk-lekuk bumi sebagaimana adanya: mentah, sunyi, megah, dan bebas dari tirani definisi sempit akal manusia modern.",
      "Ketika ia menoleh ke belakang untuk terakhir kalinya, menara-menara kota metropolitan yang menjulang angkuh di kejauhan tampak seperti deretan nisan kelabu yang perlahan memudar ditelan bias cahaya matahari pagi yang kian menyala terang."
    ],
    [
      "Jalanan setapak yang ia lalui kian lama kian menanjak meniti punggung perbukitan kapur yang tandus. Di tepi jurang yang dalam, seekor burung elang bersayap cokelat tua terbang melayang anggun tanpa mengepakkan sayapnya, memanfaatkan arus udara panas yang membubung dari dasar lembah.",
      "Burung itu tidak membutuhkan identitas paspor, sertifikat kepemilikan tanah, ataupun gelar kebangsawanan untuk menaklukkan luasnya angkasa raya. Eksistensinya adalah penerbangan itu sendiri: murni, utuh, dan selaras dengan hukum keseimbangan kosmos yang tak pernah berdusta.",
      "Sang anak Adam berhenti sejenak di samping sebatang pohon kaktus berduri yang berbunga merah cerah di celah batu cadas yang kering kerontang. Bagaimana mungkin seuntai keindahan yang begitu rapuh dan anggun dapat bertahan hidup di tengah lingkungan yang begitu kejam tanpa pernah mengeluh kepada Sang Pencipta?",
      "Ia menyentuh kelopak bunga kaktus itu dengan ujung jarinya yang berdebu, merasakan getaran denyut kehidupan vegetasi yang begitu kuat memancar dari dalam serat-serat selulosa tanaman berduri tersebut. Di sini, di tempat yang dianggap tandus dan mati oleh peradaban kota, kehidupan justru memanifestasikan dirinya dengan ketabahan yang paling murni.",
      "Ia menarik napas panjang, menatap bayangan selembar awan yang kian melaju ke arah barat menembus cakrawala tak berujung, lalu melanjutkan langkah kakinya dengan senyum simpul yang mengembang di bibirnya yang kering: perjalanan menyusuri hakikat diri baru saja dimulai."
    ]
  ),
  c(
    2,
    "Percakapan dengan Batu Karang di Pantai Sepi",
    "Conversation with the Lonely Reef",
    [
      "Hari ketujuh perjalanannya membimbing sang anak Adam tiba di sebuah pesisir pantai samudra yang sunyi senyap, jauh dari ingar-bingar dermaga pelabuhan niaga ataupun resor wisata mewah kaum borjuis. Pasir hitam vulkanik terhampar berkilau diterpa deburan ombak raksasa yang menggulung tak kenal lelah sejak ribuan tahun silam.",
      "Di tengah hempasan buih ombak samudra yang ganas, berdiri sebuah gugusan batu karang hitam pekat setinggi pohon kelapa. Permukaan karang itu berlubang-lubang dan terkikis tajam oleh hantaman air asin dan terpaan angin badai muson barat, namun posisinya tetap kokoh tak bergeser seinci pun dari dasar palung laut.",
      "Sang musafir duduk bersila di atas pasir basah di depan batu karang purba tersebut, membiarkan percikan air laut membasahi wajah dan bajunya yang kusam oleh debu perjalanan. Ia menatap batu karang itu dengan rasa takjub yang mendalam terhadap keteguhan materi anorganik yang melampaui rentang usia peradaban manusia.",
      "'Wahai batu karang yang sunyi,' gumam sang anak Adam di sela deru suara deburan ombak. 'Berapa juta ton air laut yang telah menghantam dadamu tanpa pernah membuatmu goyah mengutuk samudra? Apakah kau tidak merasa lelah dan bosan berdiri mematung di tempat yang sama selama berabad-abad tanpa pernah berpindah tempat?'",
      "Angin laut berhembus kencang meniup rambutnya, membawa aroma garam pekat dan desau suara buih ombak yang pecah di celah karang, seolah alam sedang mempersiapkan jawaban atas pertanyaan eksistensial manusia fana yang gelisah."
    ],
    [
      "Dari celah rongga batu karang yang basah, suara dengungan pelan bergema seperti nada bass seruling bambu raksasa yang ditiup oleh arus udara pasang surut air laut: 'Anak Adam yang terburu-buru... engkau bertanya tentang kelelahan karena jiwamu selalu diukur oleh hitungan detik jam tangan mekanik buatan tanganmu sendiri.'",
      "'Bagi kami bangsa bebatuan purba, waktu bukanlah deretan angka yang dikejar demi mengumpulkan tumpukan materi fana. Waktu adalah napas semesta itu sendiri. Setiap hantaman ombak yang mengikis kulit kami bukanlah hukuman derita, melainkan belaian kasih sayang alam yang sedang memahat bentuk keindahan kami agar selaras dengan kehendak samudra.'",
      "Sang anak Adam terpaku merenungkan hikmah yang memancar dari rongga batu karang hitam tersebut. Manusia modern menghabiskan sebagian besar energi hidupnya untuk melawan arus perubahan, mencemaskan masa depan yang belum tiba, dan meratapi masa lalu yang telah menjadi fosil ingatan.",
      "Kita membangun benteng ego yang rapuh, lalu merasa terluka dan hancur berkeping-keping saat benteng itu diguncang oleh ujian hidup yang sebenarnya hanya bertujuan memurnikan jiwa kita dari karat kesombongan.",
      "Ia bangkit berdiri, membungkuk hormat penuh ketulusan ke arah batu karang yang basah itu, lalu melangkah menyusuri garis pantai menuju muara sungai di kaki pegunungan dengan batin yang terasa jauh lebih lapang dan hening: belajar dari ketabahan batu karang adalah fondasi pertama menuju kedamaian batin sejati."
    ]
  ),
  c(
    3,
    "Malam Dingin di Lembah Seribu Kunang-Kunang",
    "Cold Night in the Valley of a Thousand Fireflies",
    [
      "Matahari terbenam di balik deretan bukit pinus, meninggalkan langit senja dalam gradasi warna lembayung ungu kemerahan yang perlahan meredup ditelan tirai malam yang dingin. Sang pengembara tiba di sebuah lembah cekung berawa yang diapit oleh tebing-tebing batu kapur yang curam dan lembap.",
      "Udara malam pegunungan anjlok drastis menusuk tulang sumsumnya, memaksanya mengumpulkan ranting-ranting pohon cemara kering untuk menyalakan perapian kecil di depan ceruk goa batu tempatnya bermalam. Suara derit jangkrik hutan dan gemericik air mata air di celah bebatuan menjadi orkestra sunyi yang menemani rasa laparnya.",
      "Namun ketika bara api perapian mulai meredup menyisakan kepulan asap tipis beraroma damar wangi, sebuah keajaiban visual mendadak merekah di seluruh penjuru lembah gelap tersebut. Dari celah-celah daun pakis raksasa dan permukaan air rawa yang tenang, ribuan titik cahaya hijau keemasan mulai terbang melayang perlahan ke udara malam.",
      "Lembah itu seketika bertransformasi menjadi galaksi hidup di atas bumi: ribuan ekor kunang-kunang menari-nari dalam formasi ritmis yang memukau, memancarkan kedipan cahaya lembut yang menyinari kegelapan tanpa menghasilkan panas yang membakar.",
      "Sang anak Adam mematikan sisa bara apinya, duduk terpesona di mulut ceruk goa dengan kedua telapak tangan menengadah membiarkan beberapa ekor kunang-kunang hinggap di jemarinya yang dingin."
    ],
    [
      "Kunang-kunang kecil yang hinggap di ujung telunjuknya itu memancarkan kedipan cahaya berdenyut teratur, seperti denyut detak jantung mungil yang bergetar penuh tekad kehidupan. Makhluk sekecil itu hanya memiliki rentang hidup beberapa pekan di alam bebas, namun ia mendedikasikan seluruh sisa napasnya untuk bersinar menerangi gulita malam.",
      "Ia tidak mencemaskan berapa lama cahayanya akan sanggup bertahan, tidak pula membandingkan kecerahan pancaran cahayanya dengan sinar bulan purnama yang megah di langit atas. Ia bersinar semata-mata karena memancarkan cahaya adalah ekspresi fitrah terdalam dari keberadaannya sebagai ciptaan Tuhan.",
      "Betapa seringnya manusia modern memadamkan cahaya kebaikan di dalam batinnya sendiri hanya karena merasa kontribusinya terlalu kecil dan tak bermakna di hadapan hiruk-pikuk dunia yang bising? Kita menolak berbuat baik hanya karena merasa tak mampu mengubah dunia dalam sekejap mata, melupakan bahwa samudra raya sesungguhnya tersusun dari miliaran tetesan embun yang bersatu.",
      "Kehangatan lembut dari pendaran cahaya seribu kunang-kunang itu seolah merayap masuk menghangatkan relung jiwanya yang dingin oleh kesendirian pengembaraan. Sendiri tidak selalu berarti sepi, sebagaimana kegelapan malam sesungguhnya hanyalah kanvas suci yang diciptakan agar cahaya-cahaya ketulusan dapat terlihat dengan jelas benderang.",
      "Di bawah selimut cahaya ribuan serangga malam itu, sang anak Adam merebahkan tubuhnya di atas hamparan daun kering dan tertidur dengan senyum damai yang menyejukkan sanubari, bermimpi tentang sebuah dunia di mana setiap manusia berani menyalakan lentera kecil di dalam dadanya masing-masing."
    ]
  ),
  c(
    4,
    "Pasar Ilusi dan Saudagar Penjual Waktu",
    "The Market of Illusions and the Merchant of Time",
    [
      "Pada pekan ketiga perjalanannya, sang anak Adam tiba di pinggiran sebuah kota kuno bertembok bata merah yang terletak di persimpangan jalur karavan padang pasir. Gerbang kota itu dipenuhi oleh riuh rendah pedagang dari berbagai penjuru benua yang mengenakan jubah sutra aneka warna dan perhiasan emas permata yang berkilau di bawah terik matahari siang.",
      "Pasar itu dinamai Pasar Ilusi oleh para musafir gurun, tempat segala macam komoditas aneh diperjualbelikan dengan mata uang yang tak lazim: di satu sudut seorang tabib menjual botol ramuan penunda penuaan fisik, di sudut lain seorang peramal menjajakan sertifikat kepemilikan bintang di galaksi Andromeda, sementara di los tengah seorang saudagar tua berkepala botak menjajakan butiran pasir kaca yang diklaim sebagai pecahan waktu masa lalu.",
      "Orang-orang kaya dari seluruh penjuru negeri berdesak-desakan menukarkan karung-karung koin emas dan perak mereka demi membeli sebotol kecil air waktu yang dijanjikan dapat mengembalikan masa muda mereka selama beberapa jam saja. Mata mereka menyala penuh ketamakan bercampur kepanikan luar biasa terhadap bayang-bayang kematian yang kian mendekat.",
      "Sang anak Adam melangkah mendekati meja lapak sang saudagar waktu tua itu. Di atas meja berlapis kain beludru hitam tersebut berderet puluhan botol kristal bersegel lilin biru yang di dalamnya tampak pusaran kabut emas berputar lambat tanpa henti.",
      "'Berapa harga sebotol masa lalu ini, wahai Saudagar?' tanya sang anak Adam dengan tatapan mata yang tenang menatap sang pedagang tua yang memiliki jari-jemari panjang berkuku emas."
    ],
    [
      "Saudagar tua itu mendongakkan wajahnya yang keriput, menatap pakaian sang musafir yang compang-camping tanpa hiasan perhiasan sepeser pun. Namun alih-alih mengusirnya seperti pengemis jalanan, sang saudagar menatap dalam-dalam ke dalam pupil mata sang anak Adam dan tersenyum kecut penuh kegetiran.",
      "'Bagi mereka yang serakah di pasar ini, harganya adalah seluruh keping emas yang mereka kumpulkan seumur hidup,' bisik sang saudagar dengan suara parau yang terdengar seperti gesekan kertas perkamen tua. 'Tetapi bagimu yang tidak memiliki apa-apa untuk disombongkan, harganya adalah sebuah jawaban jujur atas satu pertanyaan sederhana: apa yang paling engkau sesali dari waktu yang telah berlalu di punggungmu?'",
      "Sang anak Adam terdiam sejenak, menatap pusaran kabut emas di dalam botol kristal itu dengan senyum tulus yang memancarkan kejernihan batin. 'Aku tidak memiliki penyesalan atas waktu yang telah pergi, Saudagar. Rasa sakit, kegagalan, dan luka di masa lalu adalah guru-guru terbaik yang telah memahat jiwaku hingga berani melangkah sejauh ini menyusuri bumi.'",
      "'Waktu tidak dapat dibeli kembali dengan emas ataupun sihir, karena nilai tertinggi dari waktu justru terletak pada ketidakmampuannya untuk diulang: ia menuntut kita hadir seutuhnya di setiap tarikan napas saat ini tanpa menunda kebaikan sesaat pun.'",
      "Mendengar jawaban itu, sang saudagar waktu menghela napas panjang, lalu menyapu seluruh botol kristal di atas mejanya hingga lenyap menjadi butiran debu pasir yang ditiup angin gurun. 'Pergilah, anak muda... engkau telah memiliki harta yang paling mahal di semesta ini: kesadaran bahwa hidup yang sejati hanya terjadi di sini dan saat ini juga.'"
    ]
  ),
  c(
    5,
    "Hujan Asam di Hutan yang Kehilangan Daun",
    "Acid Rain in the Leafless Forest",
    [
      "Meninggalkan kota ilusi di belakangnya, jalur pengembaraan sang anak Adam membelah kawasan lembah industri kuno yang telah ditinggalkan oleh peradaban penambang belerang. Ratusan cerobong asap batu bata yang telah runtuh berdiri kaku seperti tulang-tulang raksasa purba yang berserakan di tanah gambut yang hangus menghitam.",
      "Di depannya terbentang kawasan hutan yang sangat memilukan: ribuan pohon jati dan eukaliptus berdiri gundul tanpa sehelai daun hijau pun yang tersisa di dahan-dahannya. Batang-batang pohon itu berwarna putih pucat seperti tulang manusia yang terkikis cuaca ekstrem, sementara tanah di bawahnya tertutup lumpur keabuan yang berbau menyengat seperti asam cuka pekat.",
      "Langit di atas hutan itu berwarna kuning tembaga murung, diselimuti awan tebal bermuatan gas belerang beracun yang dimuntahkan oleh eksploitasi kerak bumi masa lalu. Ketika angin bertiup kencang, rintik hujan asam mulai turun membasahi bumi dengan tetesan cairan dingin yang mendesis pedih saat menyentuh kulit lengannya yang terbuka.",
      "Sang musafir segera berlindung di balik rongga batang pohon beringin raksasa yang telah mati mengering di tepi tebing sungai mati. Dari tempat perlindungannya, ia menyaksikan bagaimana tetesan air hujan itu membakar lumut kerak yang tersisa di bebatuan kali, menghancurkan sisa-sisa ekosistem yang sedang berjuang memulihkan diri.",
      "Betapa dahsyatnya luka yang sanggup ditorehkan oleh ketamakan manusia terhadap rahim ibu pertiwi yang telah melahirkan dan memelihara kehidupannya sendiri tanpa pamrih!"
    ],
    [
      "Namun di tengah lanskap kehancuran ekologis yang tampak seperti neraka duniawi tersebut, mata sang anak Adam menangkap sebuah keajaiban mikro di celah akar beringin tua tempatnya berteduh. Di antara lapisan tanah gambut yang beracun, sebutir biji spora pakis purba tampak mulai memecah kulit bijinya yang keras.",
      "Sebuah tunas hijau muda sebesar jarum jahit menyembul perlahan dari balik tanah basah, menengadahkan dua lembar daun mungilnya menyerap tetesan embun yang menetes dari akar kayu yang telah mati. Tunas kecil itu tidak memiliki akal budi untuk mengutuk manusia yang telah merusak habitat hutannya, tidak pula berputus asa di hadapan tanah yang tercemar racun kimia.",
      "Ia tumbuh semata-mata karena dorongan kodrat alamiah kehidupan yang tak kenal menyerah: di mana ada setitik kelembapan dan celah udara, di situlah kehidupan akan mencari jalan keluar untuk merajut kembali harmoni yang koyak.",
      "Sang anak Adam meneteskan air minum dari guci tembikar miliknya ke sekeliling tanah tempat tunas pakis itu tumbuh, melindunginya dengan susunan serpihan batu kali agar tidak tersapu oleh aliran air hujan asam yang mengalir di parit lereng tebing.",
      "Bumi ini sesungguhnya tidak pernah membutuhkan manusia untuk bertahan hidup; manusialah yang sepenuhnya bergantung pada kemurahan hati alam semesta. Jika kita terus bersikap sombong dan tamak memperkosa sumber daya bumi, alam akan dengan sangat mudah membersihkan tubuhnya dari parasit peradaban manusia yang durhaka, sebelum melahirkan generasi vegetasi baru yang lebih bijaksana dari sisa abu sejarah kita."
    ]
  ),
  c(
    6,
    "Perpustakaan Pasir di Gurun Kebisuan",
    "The Sand Library in the Desert of Silence",
    [
      "Gurun Kebisuan adalah bentang padang pasir terluas di benua selatan, tempat angin bertiup tanpa henti membentuk bukit-bukit bukit pasir raksasa yang posisinya selalu berganti setiap pergantian musim. Di hamparan laut pasir keemasan itu, tidak ada bayangan pepohonan ataupun gemericik sumber air oasis; hanya ada riak-riak pasir halus yang berbisik ditiup angin sepoi-sepoi padang gurun.",
      "Legenda para penunggang unta Badui menyebutkan bahwa di jantung gurun tersebut tersembunyi Perpustakaan Pasir: sebuah situs purba di mana seluruh ilmu pengetahuan dan kebijaksanaan semesta tersimpan bukan dalam bentuk buku kertas atau prasasti batu, melainkan dalam susunan pola butiran pasir yang dipahat oleh hembusan angin langit.",
      "Sang anak Adam berjalan menembus badai pasir ringan yang menyelimuti gurun pada hari kedua puluh lima pengembaraannya. Butiran pasir halus menggelitik kulit wajahnya dan menari-nari di sekeliling jubah pengelana yang ia kenakan, menciptakan irama gesekan yang menenangkan frekuensi batinnya yang hening.",
      "Menjelang tengah hari saat matahari berada tepat di puncak ubun-ubun, ia tiba di sebuah lembah bukit pasir melingkar yang terlindung dari terpaan angin badai kencang. Di dasar lembah pasir itu, pola-pola riak pasir halus terhampar membentuk formasi geometris fraktal yang luar biasa indah dan teratur, menyerupai naskah kaligrafi purba berukuran raksasa yang terbentang ratusan meter.",
      "Sang musafir duduk bersila di tepi bukit pasir, menatap ke arah pola-pola riak pasir di dasar lembah itu dengan pandangan batin yang jernih dan terbuka."
    ],
    [
      "Setiap kali hembusan angin gurun menyapu permukaan lembah pasir tersebut, jutaan butiran pasir bergeser secara harmonis, menghapus satu pola geometris dan secara bersamaan melahirkan pola tulisan alam yang baru tanpa meninggalkan cacat ataupun bekas goresan yang kasar.",
      "Di sanalah sang anak Adam memahami hakikat ilmu yang melampaui aksara cetak buatan tangan manusia: ilmu sejati bukanlah tumpukan hafalan teori atau dogma kaku yang dibukukan demi mendebat dan mengalahkan argumen orang lain di panggung seminar.",
      "Ilmu sejati adalah kelenturan budi pekerti yang mampu membaca tanda-tanda kebesaran semesta di setiap perubahan keadaan, sebagaimana pasir gurun yang selalu rela merelakan bentuk lamanya dihapus demi menyambut hembusan napas baru dari langit Ilahi.",
      "Berapa banyak pertumpahan darah dan permusuhan antarmanusia yang terjadi sepanjang sejarah hanya karena masing-masing kelompok memutlakkan tafsir teksnya sendiri dan menolak kebenaran yang dibawa oleh hembusan angin dari kelompok lain?",
      "Ia mengambil segenggam pasir halus ke telapak tangannya, membiarkan butiran-butiran mineral emas itu meluncur jatuh melalui sela-sela jemarinya kembali ke pangkuan gurun raya: memegang kebenaran tidak boleh dilakukan dengan genggaman kepalan tangan yang kaku dan fanatik, melainkan dengan telapak tangan yang terbuka penuh kerendahan hati dan kasih sayang universal."
    ]
  ),
  c(
    7,
    "Perjumpaan dengan Bayangan Diri di Telaga Sunyi",
    "Meeting the Inner Shadow at the Silent Lake",
    [
      "Keluar dari padang pasir yang membakar, sang anak Adam mendaki dataran tinggi plato berbatu kapur yang diselimuti padang rumput tundra pegunungan yang hijau royo-royo. Di tengah cekungan kaldera gunung berapi purba yang telah padam selama jutaan tahun, terbentang sebuah telaga air tawar yang airnya berwarna biru kehijauan jernih bak cermin zamrud raksasa.",
      "Telaga itu dinamai Telaga Sunyi oleh para pertapa pertapa masa silam karena permukaannya yang tidak pernah beriak oleh angin kencang sekalipun. Airnya begitu tenang dan transparan hingga formasi bebatuan koral air tawar di kedalaman dua puluh meter tampak jelas seolah berada tepat di depan pelupuk mata.",
      "Sang anak Adam meletakkan tas perbekalannya di tepi telaga yang beralaskan hamparan rumput lumut lembut, lalu melangkah ke atas sebuah bongkahan batu marmer putih yang menjorok ke tengah permukaan telaga jernih tersebut. Ia berlutut di tepi batu marmer, menundukkan kepalanya untuk membasuh wajahnya yang letih setelah berminggu-minggu terpapar terik matahari gurun.",
      "Namun saat bayangan wajahnya terpantul di permukaan air telaga yang tenang bagai kaca cermin tersebut, pantulan bayangan itu tidak bergerak mengikuti gerakannya. Bayangan dirinya di dalam air tetap diam mematung, menatap lurus ke dalam matanya dengan tatapan yang memancarkan kejujuran telanjang yang menembus seluruh topeng kepalsuan sosialnya.",
      "Sosok bayangan di dalam air itu tidak mengenakan jubah pengelana sederhana yang ia pakai, melainkan menampilkan seluruh wujud ketakutan, kecemasan, keegoisan, dan ambisi tersembunyi yang selama bertahun-tahun ia sembunyikan rapat-rapat di sudut tergelap alam bawah sadarnya."
    ],
    [
      "'Siapakah engkau sesungguhnya, anak Adam?' suara bayangan di dalam air telaga itu bergema lembut langsung di dalam relung batinnya yang terdalam, bukan melalui gelombang suara telinga lahiriah. 'Apakah engkau mengembara menyusuri bumi ini murni karena kerinduan mencari kebenaran hakiki, ataukah engkau sebenarnya hanya seorang pengecut yang sedang melarikan diri dari tanggung jawab dan luka masa lalumu di kota?'",
      "Pertanyaan itu menghantam kesadaran sang anak Adam dengan kekuatan yang meremukkan seluruh fondasi rasionalitasnya. Air mata menetes dari sudut pelupuk matanya, jatuh ke permukaan telaga memicu riak lingkaran konsentris halus yang membiaskan bayangan di dalam air tersebut.",
      "Alih-alih menyangkal atau membela diri dengan dalih-dalih spiritual yang muluk-muluk, sang anak Adam menundukkan kepalanya dalam-dalam dan berbisik dengan kejujuran yang paling murni: 'Engkau benar, wahai bayanganku sendiri... di awal perjalananku, aku memang melarikan diri dari kepedihan cinta yang kandas dan kehampaan peradaban kota yang munafik.'",
      "'Tetapi seiring dengan setiap langkah yang kutorehkan di atas debu bumi ini, pelarianku perlahan bertransformasi menjadi penyerahan diri yang tulus. Aku tidak lagi ingin menyembunyikan kelemahanku di balik jubah kesalehan palsu; aku menerima diriku apa adanya: seorang manusia rapuh yang sedang belajar menjadi hamba yang berbakti bagi semesta.'",
      "Mendengar pengakuan dosa yang tulus tanpa kepalsuan itu, sosok bayangan di dalam air telaga tersenyum hangat dengan penuh kelembutan, lalu perlahan memudar dan menyatu kembali menjadi pantulan wajah sang anak Adam yang kini memancarkan ketenangan batin yang sejati: perdamaian dengan semesta hanya dapat terwujud setelah manusia berani berdamai dan memeluk bayangan gelap di dalam dirinya sendiri."
    ]
  ),
  c(
    8,
    "Pintu Kayu Tanpa Rumah di Tengah Padang Sabana",
    "The Door Without a House on the Open Savanna",
    [
      "Dataran tinggi plato berganti menjadi padang sabana rumput ilalang keemasan yang terbentang sejauh mata memandang hingga menyentuh garis cakrawala langit barat. Angin sore berhembus sepoi-sepoi menggoyangkan pucuk-pucuk bunga ilalang putih, menciptakan gelombang ombak daratan yang berkilau disiram cahaya mentari senja yang keemasan.",
      "Di tengah padang ilalang yang maha luas tanpa ada satu pun pohon peneduh atau bangunan permukiman, berdiri sebuah pemandangan absurd yang memukau nalar: sebuah kusen pintu kayu jati tua berukir gaya arsitektur Jawa klasik berdiri tegak mandiri di tengah rerumputan, lengkap dengan daun pintu berukir yang tertutup rapat dan gerendel kuningan tua yang terpasang kokoh.",
      "Tidak ada dinding bata, tiang penyangga, ataupun atap rumah di sekeliling pintu kayu tersebut; pintu itu benar-benar berdiri sendirian di alam terbuka, seolah-olah dipindahkan oleh kekuatan gaib dari sebuah rumah joglo kuno dan ditancapkan begitu saja di tengah padang sabana luas.",
      "Sang anak Adam mendekati pintu misterius itu dengan langkah pelan dan hati-hati. Ia mengitari pintu tersebut berkali-kali: dari sisi depan, yang terlihat di balik pintu kayu itu adalah hamparan padang ilalang yang sama luasnya. Dari sisi belakang pun, pemandangan yang tersaji hanyalah padang ilalang yang membentang hingga ke kaki bukit.",
      "Namun ada sebuah daya tarik magnetis yang tak kasat mata memancar dari pegangan pintu kuningan berukir kepala naga tersebut, mengundang siapa pun yang lewat untuk memutar kuncinya dan melangkah menyeberangi ambang batasnya."
    ],
    [
      "Sang anak Adam meletakkan telapak tangannya di atas pegangan kuningan pintu itu: logam tua tersebut terasa hangat dan bergetar halus seperti dengungan senar sitar yang baru saja dipetik lembut. Ia menarik napas panjang, memutar pegangan pintu, dan mendorong daun pintu kayu jati itu hingga terbuka lebar dengan bunyi derit engsel tua yang sangat merdu.",
      "Keajaiban yang melampaui logika ruang dan waktu seketika tersaji di depan matanya: ketika pintu itu terbuka, pemandangan di dalam bingkai kusen kayu itu bukanlah padang ilalang sabana di belakangnya, melainkan sebuah lorong cahaya putih menyilaukan yang dipenuhi aroma bunga melati dan desau angin surga yang menyejukkan jiwa!",
      "Di balik ambang pintu itu, hukum gravitasi dan batas fisik dunia fana seolah runtuh total; ia dapat melihat sekilas dimensi keabadian di mana seluruh jiwa yang pernah hidup di bumi sedang menari dalam kebahagiaan tanpa rasa sakit, ketakutan, ataupun batas ruang waktu.",
      "Namun sang anak Adam tidak melangkah masuk ke dalam pintu keabadian yang memikat tersebut. Ia tersenyum simpul, lalu dengan penuh kelembutan dan rasa takzim menarik kembali daun pintu kayu jati itu hingga tertutup rapat dan menguncinya kembali dengan gerendel kuningan.",
      "'Bukan saatnya sekarang bagiku untuk melarikan diri ke dalam keabadian surgawi,' bisiknya kepada hamparan padang ilalang yang berkibar ditiup angin senja. 'Tugasku sebagai anak Adam di muka bumi belum selesai: selama masih ada saudara-saudaraku yang tertindas oleh kebodohan, kemiskinan, dan tirani ketidakadilan, ladang baktiku adalah tetap menjejakkan kaki di atas debu bumi ini memperjuangkan kemanusiaan yang beradab.'"
    ]
  ),
  c(
    9,
    "Teka-teki Naskah Kuno Tanpa Huruf",
    "The Riddle of the Blank Manuscript",
    [
      "Di ujung batas padang sabana, sang pengembara menemukan reruntuhan biara batu purba yang bertengger di bibir tebing jurang samudra selatan yang bergelora. Bangunan biara itu telah hancur dimakan usia ribuan tahun, menyisakan pilar-pilar batu granit yang dililit sulur tanaman rambat liar dan sarang burung walet laut.",
      "Di dalam relung altar batu di tengah reruntuhan yang dinaungi atap kubah yang runtuh separuh, terletak sebuah kotak tembaga berukir simbol bunga teratai bertarikh era sebelum masehi. Kotak itu tidak terkunci, dan di dalamnya tersimpan sebuah naskah kuno berupa bundel daun lontar tebal yang diikat dengan tali serat kelapa emas.",
      "Sang anak Adam duduk di atas undakan altar batu yang beralaskan lumut hijau lembut, meletakkan bundel daun lontar itu di atas pangkuannya dan membuka talinya dengan rasa hormat yang mendalam. Ia bersiap membaca ajaran-ajaran filsafat rahasia dari peradaban para resi masa silam yang legendaris.",
      "Namun betapa terkejutnya ia ketika membuka lembar demi lembar daun lontar tua tersebut: seluruh permukaan lontar itu bersih mulus tanpa torehan sebutir pun aksara, angka, simbol piktogram, ataupun gambar sketsa tangan! Lebih dari lima puluh lembar daun lontar itu dibiarkan kosong melompong sejak hari pertama dibuat oleh sang pembuat naskah kuno ribuan tahun yang lalu.",
      "Sang musafir membalik lembaran demi lembaran kosong itu berulang kali di bawah sorotan sinar matahari sore yang keemasan, berusaha mencari petunjuk tinta rahasia yang mungkin hanya terbaca jika terkena cairan asam atau pemanasan api lilin."
    ],
    [
      "Namun tidak ada tinta rahasia apa pun yang tersembunyi di dalam daun lontar tersebut; kehampaan aksara di atas lontar itu adalah sebuah pesan filosofis yang disengaja dan dirancang dengan kecerdasan spiritual tingkat tertinggi oleh sang resi purba.",
      "Sang anak Adam menatap permukaan lontar kosong di pangkuannya sambil mendengarkan deru ombak samudra yang menghantam tebing karang di bawah biara tua itu. Tiba-tiba, pemahaman hakiki merekah di dalam sanubarinya seperti kuncup bunga teratai yang mekar di pagi hari.",
      "Kitab suci yang sejati bukanlah deretan huruf mati yang dicetak di atas kertas buatan pabrik demi diperdebatkan tafsir harfiahnya oleh para teolog di mimbar-mimbar retorika. Kitab suci yang sejati adalah lembaran batin manusia itu sendiri yang senantiasa bersih dari noda fanatisme dan prasangka sempit.",
      "Setiap perjumpaan dengan sesama makhluk, setiap tatapan mata anak yatim yang kelaparan, setiap tetes embun di dahan pakis, dan setiap tarikan napas kehidupan di alam raya adalah ayat-ayat suci yang hidup yang terus ditulis oleh Sang Maha Pencipta di atas kanvas semesta detik demi detik.",
      "Ia mengembalikan bundel daun lontar kosong itu ke dalam kotak tembaga di atas altar, menutupnya dengan rasa syukur yang mendalam: kini ia memahami bahwa hidup yang bermutu bukanlah tentang seberapa banyak buku yang kita hafal di luar kepala, melainkan tentang seberapa dalam kebersihan lembar nurani kita dalam merespons panggilan cinta kasih kepada seluruh makhluk di bumi."
    ]
  ),
  c(
    10,
    "Pemberhentian yang Menggantung: Tuliskanlah Judulmu Sendiri!",
    "The Suspended Threshold: Write Your Own Title!",
    [
      "Setelah menempuh perjalanan ribuan mil melintasi lembah gunung, ngarai sunyi, gurun pasir, dan padang sabana yang luas, langkah kaki sang anak Adam akhirnya tiba di titik paling ujung dari benua daratan selatan: sebuah tanjung karang terjal yang menjorok sendirian ke tengah samudra luas tak bertepi.",
      "Di tanjung karang yang berangin kencang itu, daratan resmi berakhir; di hadapannya terbentang lautan biru keabadian yang membentang tanpa batas hingga menyatu dengan garis lengkung cakrawala langit di kejauhan. Tak ada lagi jalan setapak yang dapat dilalui kaki manusia; tak ada lagi peradaban kota ataupun rumah tempat bernaung dari dinginnya malam.",
      "Di tepi tebing tanjung karang tersebut berdiri sebuah tugu batu nisan putih tanpa ukiran nama ataupun angka tahun. Di atas puncak tugu batu itu tergeletak sebatang pena bulu angsa antik bertinta emas abadi dan sebuah buku kosong bersampul kulit rusa yang lembaran-lembarannya terbuka melambai-lambai ditiup angin samudra.",
      "Di lembar pertama buku kosong itu tertulis satu baris pengantar pendek yang ditulis dengan tinta emas berkilauan: 'Kisah pengembaraan ini sengaja dihentikan di sini tanpa kesimpulan akhir, karena perjalanan hidup seorang manusia tidak pernah dapat diwakili oleh judul dan cerita yang dirumuskan oleh orang lain.'",
      "Sang anak Adam berdiri tegak di bibir tebing karang, menatap selembar awan putih di langit yang selama ini menaungi perjalanannya perlahan-lahan menyatu dan larut ke dalam kebiruan langit senja yang damai, meninggalkan dirinya berdiri utuh, mandiri, dan berdaulat di hadapan luasnya semesta raya."
    ],
    [
      "Kisah ini sengaja kami biarkan menggantung tanpa judul resmi dan tanpa penutup yang mengikat di portal AnzaBook. Di sinilah plot twist terbesar dari buku ini diletakkan bagi engkau, wahai pembaca budiman yang telah meluangkan waktu berharga menyusuri sepuluh bab naskah ini.",
      "Apakah pengembaraan sang anak Adam ini merupakan sebuah pencarian makna ketuhanan, manifesto kedaulatan jiwa rakyat jelata, perjalanan psikologis menyembuhkan luka batin, ataukah sebuah satire mendalam terhadap ilusi peradaban modern yang kian kehilangan arah dan tujuan hidupnya?",
      "Jawabannya tidak berada di tangan penulis, tidak pula di tangan penerbit ataupun algoritma kecerdasan buatan. Jawabannya kini sepenuhnya berada di dalam genggaman jemari dan nurani engkau sendiri sebagai pembaca yang merdeka.",
      "Kami menyerahkan pena emas di atas tugu karang samudra itu ke tanganmu saat ini juga. Renungkanlah seluruh lekuk cerita dan perjumpaan yang telah engkau lalui di dalam buku ini, tataplah relung jiwamu yang paling jujur, dan beranikanlah dirimu untuk merumuskan dan menuliskan judul buku ini versimu sendiri!",
      "Sebab pada akhirnya, buku yang paling bermutu bukanlah buku yang mendiktekan seluruh kesimpulan mati ke dalam kepala pembacanya, melainkan buku yang sanggup menyalakan api keberanian di dalam dada setiap insan untuk bangkit dan menuliskan judul agung dari babad perjalanan hidupnya sendiri di muka bumi pertiwi."
    ]
  )
];

console.log("Kematian chapters:", kematianChapters.length);
console.log("Belum Ada Judul chapters:", belumAdaJudulChapters.length);

// Read special-books base template and write new special-books.ts
const specialBooksTemplate = `import type { BookSeed } from "./types";

export const specialBooks: BookSeed[] = [
  {
    slug: "ghost-back-to-campus",
    title: "Ghost Back to Campus",
    originalTitle: "Ghost Back to Campus",
    author: "Oke Sudrajat",
    authorAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    editor: "Anza Book",
    editorAvatar: "/icon.svg",
    translator: null,
    coverUrl: "/covers/ghost-campus.svg",
    coverColor: "#172554",
    synopsis:
      "Novel horor-komedi kampus karya Oke Sudrajat. Mengikuti liku-liku petualangan kocak dan menegangkan mahasiswa tingkat akhir yang harus berhadapan dengan misteri hantu gedung tua rektorat, ospek malam jumat legi, hingga teror revisi skripsi supranatural.",
    bulletinExcerpt:
      "Horor kampus bukan melulu soal kuntilanak terbang, melainkan kombinasi maut antara teror revisi bab empat dan arwah penunggu laboratorium mikrobiologi yang menolak lulus.",
    publishedYear: 2026,
    pageCount: 290,
    totalChapters: 10,
    readingMinutes: 45,
    audioDurationMinutes: 60,
    digitalPolicy: "free_open",
    accessTier: "free",
    hasPhysical: true,
    securityLevel: "standard_blur",
    isWeeklyBulletin: false,
    rakyatPriceIdr: 32000,
    standardPriceIdr: 72000,
    ratingAvg: 4.8,
    ratingCount: 195,
    availableLanguages: ["id"],
    categories: ["Horor", "Komedi", "Fiksi Remaja"],
    collectionName: "Koleksi Fiksi & Misteri",
    genres: ["Horor Komedi", "Urban Campus", "Misteri"],
    chapters: ${JSON.stringify(ghostChapters, null, 6)},
    editions: [
      {
        tier: "rakyat_economy",
        tierName: "Edisi Rakyat (Newsprint)",
        paperType: "Newsprint Halus 48.8 gsm",
        paperGsm: 48.8,
        coverType: "Softcover Art Carton 210gsm Doff",
        bindingType: "Lem Panas Lentur",
        priceIdr: 32000,
        traditionalPriceIdr: 75000,
        savingsPercent: 57,
        weightGrams: 230,
        inStock: true,
        isbn: "978-602-9591-30-1",
      },
      {
        tier: "standard_trade",
        tierName: "Edisi Standar (Bookpaper)",
        paperType: "Bookpaper Krem 72 gsm",
        paperGsm: 72.0,
        coverType: "Softcover AC 260gsm Doff + Spot UV",
        bindingType: "Jahit Benang + Lem Panas",
        priceIdr: 72000,
        traditionalPriceIdr: 98000,
        savingsPercent: 26,
        weightGrams: 310,
        inStock: true,
        isbn: "978-602-9591-31-8",
      },
    ],
    claimCodes: ["GHOST-CAMPUS-01"],
  },
  {
    slug: "kematian-kedua",
    title: "Kematian Kedua",
    originalTitle: "The Second Death",
    author: "Oke Sudrajat",
    authorAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    editor: "Anza Book",
    editorAvatar: "/icon.svg",
    translator: null,
    coverUrl: "/covers/kematian-kedua.svg",
    coverColor: "#450A0A",
    synopsis:
      "Novel horor psikologis dan thriller misteri karya Oke Sudrajat (ISBN 978-602-9591-45-3). Mengupas trauma masa lalu di sebuah perkebunan teh tua Parahyangan, di mana kematian fisik hanyalah awal dari teror hilangnya nama dan memori manusia.",
    bulletinExcerpt:
      "Kematian pertama adalah saat napas terhenti di ranjang rumah sakit; kematian kedua adalah saat namamu dihapus dari seluruh ingatan manusia yang masih hidup.",
    publishedYear: 2026,
    pageCount: 320,
    totalChapters: 10,
    readingMinutes: 48,
    audioDurationMinutes: 75,
    digitalPolicy: "free_open",
    accessTier: "free",
    hasPhysical: true,
    securityLevel: "standard_blur",
    isWeeklyBulletin: false,
    rakyatPriceIdr: 34000,
    standardPriceIdr: 76000,
    ratingAvg: 4.9,
    ratingCount: 240,
    availableLanguages: ["id"],
    categories: ["Horor", "Psikologis", "Misteri"],
    collectionName: "Koleksi Fiksi & Misteri",
    genres: ["Horor Psikologis", "Misteri", "Thriller"],
    chapters: ${JSON.stringify(kematianChapters, null, 6)},
    editions: [
      {
        tier: "rakyat_economy",
        tierName: "Edisi Rakyat (Newsprint)",
        paperType: "Newsprint Halus 48.8 gsm",
        paperGsm: 48.8,
        coverType: "Softcover Art Carton 210gsm Doff",
        bindingType: "Lem Panas Lentur",
        priceIdr: 34000,
        traditionalPriceIdr: 78000,
        savingsPercent: 56,
        weightGrams: 240,
        inStock: true,
        isbn: "978-602-9591-45-3",
      },
      {
        tier: "standard_trade",
        tierName: "Edisi Standar (Bookpaper)",
        paperType: "Bookpaper Krem 72 gsm",
        paperGsm: 72.0,
        coverType: "Softcover AC 260gsm Doff + Spot UV",
        bindingType: "Jahit Benang + Lem Panas",
        priceIdr: 76000,
        traditionalPriceIdr: 102000,
        savingsPercent: 25,
        weightGrams: 320,
        inStock: true,
        isbn: "978-602-9591-46-0",
      },
    ],
    claimCodes: ["KEMATIAN-KEDUA-01"],
  },
  {
    slug: "belum-ada-judul",
    title: "Belum Ada Judul",
    originalTitle: "Untitled: The Wandering of Adam's Child",
    author: "Selembar Awan",
    authorAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    editor: "Anza Book",
    editorAvatar: "/icon.svg",
    translator: null,
    coverUrl: "/covers/belum-ada-judul.svg",
    coverColor: "#1E293B",
    synopsis:
      "Terinspirasi dari naskah esai filosofis 'Anak Adam Menyusuri Bumi' karya Selembar Awan. Mengikuti perjalanan eksistensial menembus batas-batas kesepian kosmis, makna waktu, dan perjumpaan dengan hakikat diri. Diakhiri dengan plot twist terbuka: sebuah buku tanpa judul yang menantang pembaca merumuskan judul hidupnya sendiri.",
    bulletinExcerpt:
      "Sebuah perjalanan tanpa kompas lahiriah; di mana setiap bab adalah cermin kejujuran, dan akhir kisahnya sengaja dibiarkan menggantung agar pembaca menuliskan judulnya sendiri.",
    publishedYear: 2026,
    pageCount: 310,
    totalChapters: 10,
    readingMinutes: 50,
    audioDurationMinutes: 80,
    digitalPolicy: "free_open",
    accessTier: "free",
    hasPhysical: true,
    securityLevel: "standard_blur",
    isWeeklyBulletin: false,
    rakyatPriceIdr: 35000,
    standardPriceIdr: 75000,
    ratingAvg: 4.9,
    ratingCount: 310,
    availableLanguages: ["id"],
    categories: ["Filsafat", "Sastra", "Eksistensial"],
    collectionName: "Pustaka Kontemplasi",
    genres: ["Filsafat Kontemporer", "Perjalanan Eksistensial", "Misteri"],
    chapters: ${JSON.stringify(belumAdaJudulChapters, null, 6)},
    editions: [
      {
        tier: "rakyat_economy",
        tierName: "Edisi Rakyat (Newsprint)",
        paperType: "Newsprint Halus 48.8 gsm",
        paperGsm: 48.8,
        coverType: "Softcover Art Carton 210gsm Doff",
        bindingType: "Lem Panas Lentur",
        priceIdr: 35000,
        traditionalPriceIdr: 80000,
        savingsPercent: 56,
        weightGrams: 235,
        inStock: true,
        isbn: "978-602-0099-01-3",
      },
      {
        tier: "standard_trade",
        tierName: "Edisi Standar (Bookpaper)",
        paperType: "Bookpaper Krem 72 gsm",
        paperGsm: 72.0,
        coverType: "Softcover AC 260gsm Doff + Spot UV",
        bindingType: "Jahit Benang + Lem Panas",
        priceIdr: 75000,
        traditionalPriceIdr: 105000,
        savingsPercent: 28,
        weightGrams: 315,
        inStock: true,
        isbn: "978-602-0099-02-0",
      },
    ],
    claimCodes: ["SELEMBAR-AWAN-01"],
  },
];
`;

fs.writeFileSync("apps/api/src/db/seeds/special-books.ts", specialBooksTemplate, "utf-8");
console.log("Successfully wrote rich special-books.ts with 10 chapters each and 4-5 paragraphs per page!");
