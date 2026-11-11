const seedSongs = [
  // LOVE
  {
    title: "Tum Se Hi",
    artist: "Mohit Chauhan, Pritam",
    album: "Jab We Met",
    mood: "love",
    youtubeId: "mt9xg0mmt60",
    backupId: "cb0vD_i2p-0",
    duration: 323,
    cover: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Aadha sa vaada kabhi, aadhe se zyaada kabhi... jee rahe the tum se hi",
    releaseYear: 2007
  },
  {
    title: "Kesariya",
    artist: "Arijit Singh, Pritam",
    album: "Brahmastra",
    mood: "love",
    youtubeId: "BddP6PYo2gs",
    backupId: "q7vX_iW3iM4",
    duration: 268,
    cover: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Kesariya tera ishq hai piya, rang jaaun jo main haath lagaun",
    releaseYear: 2022
  },
  {
    title: "Raabta (Kehte Hain Khuda)",
    artist: "Arijit Singh, Hamsika Iyer",
    album: "Agent Vinod",
    mood: "love",
    youtubeId: "z-diRlyLGgg",
    backupId: "0BsbS8oFm7c",
    duration: 244,
    cover: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Kehte hain khuda ne iss jahan mein sabhi ke liye kisi na kisi ko hai banaya",
    releaseYear: 2012
  },
  {
    title: "Tera Hone Laga Hoon",
    artist: "Atif Aslam, Alisha Chinai",
    album: "Ajab Prem Ki Ghazab Kahani",
    mood: "love",
    youtubeId: "rTuxUAuJRyY",
    backupId: "F1Tms237Z-A",
    duration: 300,
    cover: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Shining in the setting sun like a pearl upon the ocean, come and feel me",
    releaseYear: 2009
  },
  {
    title: "Apna Bana Le",
    artist: "Arijit Singh, Sachin-Jigar",
    album: "Bhediya",
    mood: "love",
    youtubeId: "ElZfdU54Cp8",
    backupId: "4z06f8p_Dbg",
    duration: 261,
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Tu mera koi na hoke bhi kuch laage... apna bana le piya",
    releaseYear: 2022
  },
  {
    title: "Pee Loon",
    artist: "Mohit Chauhan, Pritam",
    album: "Once Upon a Time in Mumbaai",
    mood: "love",
    youtubeId: "2k_O832-7U4",
    backupId: "8_8E7-y8R4k",
    duration: 288,
    cover: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Pee loon tere neele neele naino se shabnam, tere gile gile hontho ki sargam",
    releaseYear: 2010
  },
  {
    title: "Iktara",
    artist: "Kavita Seth, Amitabh Bhattacharya",
    album: "Wake Up Sid",
    mood: "love",
    youtubeId: "fSS_R91Nimw",
    backupId: "x0v3X9xI7vQ",
    duration: 254,
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Goonja sa hai koi iktara iktara, goonja sa hai koi iktara",
    releaseYear: 2009
  },
  {
    title: "Hawayein",
    artist: "Arijit Singh, Pritam",
    album: "Jab Harry Met Sejal",
    mood: "love",
    youtubeId: "cYOB941gyXI",
    backupId: "7kP6Lq9i5R4",
    duration: 290,
    cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Hawayein hawayein le jaye mujhe kahan... jahan tu muskuraye",
    releaseYear: 2017
  },

  // DARD
  {
    title: "Channa Mereya",
    artist: "Arijit Singh, Pritam",
    album: "Ae Dil Hai Mushkil",
    mood: "dard",
    youtubeId: "284VoJ-4G3U",
    backupId: "bzSTpdcs-EI",
    duration: 289,
    cover: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Acha chalta hoon, duaon mein yaad rakhna... mere zikr ka zubaan pe swaad rakhna",
    releaseYear: 2016
  },
  {
    title: "Agar Tum Saath Ho",
    artist: "Alka Yagnik, Arijit Singh, A.R. Rahman",
    album: "Tamasha",
    mood: "dard",
    youtubeId: "sK7riqg2mr4",
    backupId: "xRb8hUVWDAg",
    duration: 341,
    cover: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Dil ye sambhal jaaye agar tum saath ho... har gham phisal jaaye agar tum saath ho",
    releaseYear: 2015
  },
  {
    title: "Kabira",
    artist: "Tochi Raina, Rekha Bhardwaj",
    album: "Yeh Jawaani Hai Deewani",
    mood: "dard",
    youtubeId: "jHNNMj5bNQw",
    backupId: "4z06f8p_Dbg",
    duration: 251,
    cover: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Kaisi teri khudgarzi, na dhoop chune na chaanv... re kabira maan jaa",
    releaseYear: 2013
  },
  {
    title: "Tujhe Bhula Diya",
    artist: "Mohit Chauhan, Shekhar Ravjiani",
    album: "Anjaana Anjaani",
    mood: "dard",
    youtubeId: "p9Kk8X_fUjQ",
    backupId: "vL1cO_z9R8k",
    duration: 279,
    cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Tujhe bhula diya, phir kyun teri yaadon ne mujhe rula diya",
    releaseYear: 2010
  },
  {
    title: "Phir Le Aya Dil",
    artist: "Arijit Singh, Pritam",
    album: "Barfi!",
    mood: "dard",
    youtubeId: "24b48O54u-Y",
    backupId: "V_9b4eX2-wE",
    duration: 305,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Phir le aya dil majboor kya keeje, raas na aaya rehna door kya keeje",
    releaseYear: 2012
  },
  {
    title: "Luka Chuppi",
    artist: "Lata Mangeshkar, A.R. Rahman",
    album: "Rang De Basanti",
    mood: "dard",
    youtubeId: "_ikZtcgAMxo",
    backupId: "T8w7kY08n1s",
    duration: 396,
    cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Luka chuppi bahut hui saamne aaja na, kahan kahan dhoondha tujhe thak gayi hai ab teri maa",
    releaseYear: 2006
  },
  {
    title: "Hamari Adhuri Kahani",
    artist: "Arijit Singh, Jeet Gannguli",
    album: "Hamari Adhuri Kahani",
    mood: "dard",
    youtubeId: "x8w9e3L48iU",
    backupId: "yGzBfC-aY5M",
    duration: 398,
    cover: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Khushbu se teri yunhi takra gaye, chalte chalte dekho na hum kahan aa gaye",
    releaseYear: 2015
  },

  // SUKOON
  {
    title: "Kun Faya Kun",
    artist: "A.R. Rahman, Mohit Chauhan, Javed Ali",
    album: "Rockstar",
    mood: "sukoon",
    youtubeId: "T94PHkuydcw",
    backupId: "Wp0v70fQj-8",
    duration: 473,
    cover: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Jab kahin pe kuch nahi bhi nahi tha, wahi tha wahi tha wahi tha",
    releaseYear: 2011
  },
  {
    title: "Maula Mere Maula",
    artist: "Roop Kumar Rathod, Mithoon",
    album: "Anwar",
    mood: "sukoon",
    youtubeId: "yGzBfC-aY5M",
    backupId: "K8X9hH2C0oI",
    duration: 360,
    cover: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Aankhein teri kitni haseen, ke inka aashiq main ban gaya hoon",
    releaseYear: 2007
  },
  {
    title: "Khaabon Ke Parinday",
    artist: "Mohit Chauhan, Alyssa Mendonsa",
    album: "Zindagi Na Milegi Dobara",
    mood: "sukoon",
    youtubeId: "R0XjxTH3rLo",
    backupId: "Xn8_4e0K5eU",
    duration: 253,
    cover: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Udne lage hain hawa mein parinday, khulne lage hain naye naye raaste",
    releaseYear: 2011
  },
  {
    title: "Der Lagi Lekin",
    artist: "Shankar Mahadevan, Shankar-Ehsaan-Loy",
    album: "Zindagi Na Milegi Dobara",
    mood: "sukoon",
    youtubeId: "VfL8qQ_x3yU",
    backupId: "8M_x_b2p3_U",
    duration: 357,
    cover: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Der lagi lekin maine ab hai jeena seekh liya, aasman chhoo kar naye sapne boondh liya",
    releaseYear: 2011
  },
  {
    title: "Tu Kisi Rail Si",
    artist: "Swanand Kirkire, Indian Ocean",
    album: "Masaan",
    mood: "sukoon",
    youtubeId: "6jO2Zf2-k8A",
    backupId: "v3_t8hE44gQ",
    duration: 236,
    cover: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Tu kisi rail si guzarti hai, main kisi pul sa thartharata hoon",
    releaseYear: 2015
  },
  {
    title: "Aaj Din Chadheya",
    artist: "Rahat Fateh Ali Khan, Pritam",
    album: "Love Aaj Kal",
    mood: "sukoon",
    youtubeId: "v3_t8hE44gQ",
    backupId: "rTuxUAuJRyY",
    duration: 316,
    cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Ajj din chadheya tere rang varga, phul khileya ve ajj baagh varga",
    releaseYear: 2009
  },

  // SAFAR
  {
    title: "Safarnama",
    artist: "Lucky Ali, A.R. Rahman",
    album: "Tamasha",
    mood: "safar",
    youtubeId: "6vKucgyZ1_Y",
    backupId: "v7Kq_e_0zN8",
    duration: 251,
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "O safarnama, khayalon ka safarnama... andheron mein ujaalon ka safarnama",
    releaseYear: 2015
  },
  {
    title: "Ilahi",
    artist: "Arijit Singh, Pritam",
    album: "Yeh Jawaani Hai Deewani",
    mood: "safar",
    youtubeId: "fdubeMFwuGs",
    backupId: "bM_V5-O5n0A",
    duration: 228,
    cover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Shaamein malang si, raatein surang si, baghi udaan pe hi na jaane kyun ilahi mera jee aaye aaye",
    releaseYear: 2013
  },
  {
    title: "Yun Hi Chala Chal",
    artist: "Udit Narayan, Hariharan, Kailash Kher",
    album: "Swades",
    mood: "safar",
    youtubeId: "yCjJyiqpAuU",
    backupId: "q_HshY-E0zE",
    duration: 448,
    cover: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Yun hi chala chal rahi, kitni haseen hai ye duniya... phool saari zameen hai ye duniya",
    releaseYear: 2004
  },
  {
    title: "Matargashti",
    artist: "Mohit Chauhan, A.R. Rahman",
    album: "Tamasha",
    mood: "safar",
    youtubeId: "6v2L2UGZJAM",
    backupId: "6vKucgyZ1_Y",
    duration: 329,
    cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Matargashti khuli sadak mein, tagdi tadak bhadak mein... aage aage dekh hota hai kya",
    releaseYear: 2015
  },
  {
    title: "Hairat",
    artist: "Lucky Ali, Vishal-Shekhar",
    album: "Anjaana Anjaani",
    mood: "safar",
    youtubeId: "q_HshY-E0zE",
    backupId: "Xn8_4e0K5eU",
    duration: 250,
    cover: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Dheeme dheeme chalna yunhi sadak pe, hairat hai hairat hai hairat hai",
    releaseYear: 2010
  },
  {
    title: "Dil Dhadakne Do",
    artist: "Suraj Jagan, Joi Barua",
    album: "Zindagi Na Milegi Dobara",
    mood: "safar",
    youtubeId: "Xn8_4e0K5eU",
    backupId: "8M_x_b2p3_U",
    duration: 231,
    cover: "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Hey hey, kab tak giney hum dhadkane... dil jaise dhadke dhadakne do",
    releaseYear: 2011
  },

  // HAPPY
  {
    title: "Badtameez Dil",
    artist: "Benny Dayal, Shefali Alvares",
    album: "Yeh Jawaani Hai Deewani",
    mood: "happy",
    youtubeId: "II2EO3NwUrQ",
    backupId: "jCEdTq3j-0U",
    duration: 252,
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Badtameez dil badtameez dil maane na maane na, paan mein pudina dekha naak ka nagina dekha",
    releaseYear: 2013
  },
  {
    title: "Gallan Goodiyaan",
    artist: "Yashita Sharma, Manish Kumar Tipu, Shankar Mahadevan",
    album: "Dil Dhadakne Do",
    mood: "happy",
    youtubeId: "jCEdTq3j-0U",
    backupId: "II2EO3NwUrQ",
    duration: 297,
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Kudiye ni tere brown rang ne munde patt te ni saare mere shehar de... gallan goodiyaan",
    releaseYear: 2015
  },
  {
    title: "Subha Hone Na De",
    artist: "Mika Singh, Shefali Alvares, Pritam",
    album: "Desi Boyz",
    mood: "happy",
    youtubeId: "nJ4kZ7y5X7I",
    backupId: "dra3pc_d68E",
    duration: 288,
    cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Humka peeni hai peeni hai humka peeni hai, subah hone na de sath khone na de",
    releaseYear: 2011
  },
  {
    title: "London Thumakda",
    artist: "Labh Janjua, Sonu Kakkar, Neha Kakkar",
    album: "Queen",
    mood: "happy",
    youtubeId: "dra3pc_d68E",
    backupId: "qFkNATtc3mc",
    duration: 230,
    cover: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Latthe di chaadar utte saleti rang mahiya, aavo saamne aavo saamne kol to ruske na ja mahiya",
    releaseYear: 2014
  },
  {
    title: "Ghungroo",
    artist: "Arijit Singh, Shilpa Rao, Vishal-Shekhar",
    album: "War",
    mood: "happy",
    youtubeId: "qFkNATtc3mc",
    backupId: "8M_x_b2p3_U",
    duration: 302,
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Kyun lamhe kharaab karein, aa ghalti behisaab karein... ghungroo toot gaye",
    releaseYear: 2019
  },
  {
    title: "Senorita",
    artist: "Farhan Akhtar, Hrithik Roshan, Abhay Deol",
    album: "Zindagi Na Milegi Dobara",
    mood: "happy",
    youtubeId: "8M_x_b2p3_U",
    backupId: "Xn8_4e0K5eU",
    duration: 231,
    cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Senorita, jo bhi pal beeta, he was looking for love and romance",
    releaseYear: 2011
  },

  // LATE NIGHT (Indie songs — 100% embeddable without restrictions!)
  {
    title: "Choo Lo",
    artist: "The Local Train",
    album: "Aalas Ka Pedh",
    mood: "late-night",
    youtubeId: "sFMRqxCexDk",
    backupId: "7v2dYQfF4Ew",
    duration: 233,
    cover: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Khada hoon aaj bhi wahin, ke dil phir beqarar hai... choo lo jo mujhe tum kabhi",
    releaseYear: 2015
  },
  {
    title: "Waqt Ki Baatein",
    artist: "Dream Note",
    album: "Single",
    mood: "late-night",
    youtubeId: "y8F3g0m3VzE",
    backupId: "sFMRqxCexDk",
    duration: 271,
    cover: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Waqt ki baatein hain, beete dino ki raatein hain... hum toh gumm hain tere khayalon mein",
    releaseYear: 2019
  },
  {
    title: "Baarishein",
    artist: "Anuv Jain",
    album: "Single",
    mood: "late-night",
    youtubeId: "dZ0fwJojhrs",
    backupId: "WcIcVapfqXw",
    duration: 207,
    cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Hawaon se tera pata poochta hoon, ab aana bahane se baarishein leke",
    releaseYear: 2018
  },
  {
    title: "Alag Aasmaan",
    artist: "Anuv Jain",
    album: "Single",
    mood: "late-night",
    youtubeId: "q0nJc8pZlZc",
    backupId: "8V8eG8u1J1s",
    duration: 213,
    cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Teri aankhon ka ye noor, mere dil ko karta majboor... alag aasmaan hai hum dono ka",
    releaseYear: 2020
  },
  {
    title: "Gul",
    artist: "Anuv Jain",
    album: "Single",
    mood: "late-night",
    youtubeId: "8V8eG8u1J1s",
    backupId: "dZ0fwJojhrs",
    duration: 224,
    cover: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Teri baatein saari gul ki tarah khil jaati hain mere veeraane mein",
    releaseYear: 2021
  },
  {
    title: "Faasle",
    artist: "Aditya Rikhari",
    album: "Single",
    mood: "late-night",
    youtubeId: "tV3iVvQk-7E",
    backupId: "sFMRqxCexDk",
    duration: 175,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Faasle hain darmiyaan, par dil se dil juda nahi... tera mera fasana puraana",
    releaseYear: 2021
  },
  {
    title: "Tu Jane Na (Unplugged)",
    artist: "Atif Aslam, Pritam",
    album: "Ajab Prem Ki Ghazab Kahani",
    mood: "late-night",
    youtubeId: "P8PWN1OmZOA",
    backupId: "rTuxUAuJRyY",
    duration: 341,
    cover: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80",
    lyricsSnippet: "Kaise bataayein kyun tujhko chahe, yaara bata na paayein",
    releaseYear: 2009
  }
];

const seedCommunityMessages = [
  {
    userName: "Ghalib-Ke-Shagird",
    userAvatar: "🥀",
    mood: "late-night",
    text: "“Hazaaron khwahishen aisi ke har khwahish pe dam nikle... bahut nikle mere armaan lekin phir bhi kam nikle.”",
    isShayari: true,
    likes: 24,
    timestamp: Date.now() - 1000 * 60 * 18
  },
  {
    userName: "Priya (Delhi)",
    userAvatar: "☕",
    mood: "sukoon",
    text: "After a 10-hour hectic work day, tuning in to Mehfil with Kun Faya Kun feels like pure healing for the soul ❤️",
    isShayari: false,
    likes: 19,
    timestamp: Date.now() - 1000 * 60 * 12
  },
  {
    userName: "Aman_Safar",
    userAvatar: "🚗",
    mood: "safar",
    text: "Driving on Delhi-Jaipur highway right now, windows down, cold breeze, and Safarnama on Mehfil. Unbeatable vibe!",
    isShayari: false,
    likes: 31,
    timestamp: Date.now() - 1000 * 60 * 7
  },
  {
    userName: "Dilkash",
    userAvatar: "🎶",
    mood: "dard",
    text: "“Waqt ne kiya kya haseen sitam, tum rahe na tum hum rahe na hum...” Some melodies hold tears that never fall.",
    isShayari: true,
    likes: 42,
    timestamp: Date.now() - 1000 * 60 * 3
  },
  {
    userName: "Simran_99",
    userAvatar: "✨",
    mood: "love",
    text: "Listening together with him from 1200 kms away... thank you Mehfil for bridging long distance nights 🎧💑",
    isShayari: false,
    likes: 28,
    timestamp: Date.now() - 1000 * 60 * 1
  }
];

const seedRequests = [
  {
    songTitle: "Tum Ho",
    artist: "Mohit Chauhan",
    mood: "love",
    requesterName: "Rohit K.",
    dedication: "Dedicating to my wife on our 3rd anniversary!",
    votes: 18,
    status: "approved",
    createdAt: Date.now() - 1000 * 60 * 30
  },
  {
    songTitle: "Ranjha",
    artist: "B Praak, Jasleen Royal",
    mood: "dard",
    requesterName: "Zara",
    dedication: "For anyone missing someone special tonight.",
    votes: 14,
    status: "pending",
    createdAt: Date.now() - 1000 * 60 * 20
  },
  {
    songTitle: "Kashmir Main Tu Kanyakumari",
    artist: "Arijit Singh, Sunidhi Chauhan",
    mood: "happy",
    requesterName: "Vikram & Squad",
    dedication: "Weekend party mood with college hostel gang!",
    votes: 9,
    status: "pending",
    createdAt: Date.now() - 1000 * 60 * 10
  }
];

module.exports = {
  seedSongs,
  seedCommunityMessages,
  seedRequests
};
