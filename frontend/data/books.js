// Centralized Book Data - Single Source of Truth
const books = [
  {
    id: 'slrspt-book-001',
    title: 'Srimad Bhagavad Gita',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 1050,
    discount: 20, // 20% discount
    images: [
      'image/book1/book1.jpg',
      'image/book1/book2.jpg',
      'image/book1/book3.jpg',
      'image/book1/book4.jpg',
      'image/book1/book5.jpg'
    ],
    weight: 2200,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Explanation',
      pages: 1524,
      size: '6x9 inches',
      description: 'A detailed commentary on the Bhagavad Gita with original Sanskrit verses and detailed explanations in Tamil. This edition includes word-by-word meaning and philosophical interpretations.'
    }
  },
  {
    id: 'slrspt-book-002',
    title: 'Kadopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 250,
    discount: 15, // 15% discount
    images: [
      'image/book2/book1.jpg',
      'image/book2/book2.jpg',
      'image/book2/book3.jpg',
      'image/book2/book4.jpg',
      'image/book2/book5.jpg'
    ],
    weight: 490,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 321,
      size: '5.5x8.5 inches',
      description: 'A comprehensive study of the Kadopanishad with original text, translation, and commentary. This book explores the philosophical teachings of the Upanishad in depth.'
    }
  },
  {
    id: 'slrspt-book-003',
    title: 'Taittriyopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 250,
    discount: 10, // 10% discount
    images: [
      'image/book3/book1.jpg',
      'image/book3/book2.jpg',
      'image/book3/book3.jpg',
      'image/book3/book4.jpg',
      'image/book3/book5.jpg'
    ],
    weight: 480,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 317,
      size: '6x9 inches',
      description: 'A detailed study of the Taittriya Upanishad with original text and detailed commentary. This book is essential for students of Vedanta philosophy.'
    }
  },
  {
    id: 'slrspt-book-004',
    title: 'Esavasyopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 60,
    discount: 0, // No discount
    images: [
      'image/book4/book1.jpg',
      'image/book4/book2.jpg',
      'image/book4/book3.jpg',
      'image/book4/book4.jpg',
      'image/book4/book5.jpg'
    ],
    weight: 120,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 54,
      size: '5x7 inches',
      description: 'A concise commentary on the Ishavasya Upanishad, one of the shortest but most important Upanishads. Includes original text and word-by-word meaning.'
    }
  },
  {
    id: 'slrspt-book-005',
    title: 'Mundakopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 100,
    discount: 25, // 25% discount
    images: [
      'image/book5/book1.jpg',
      'image/book5/book2.jpg',
      'image/book5/book3.jpg',
      'image/book5/book4.jpg',
      'image/book5/book5.jpg'
    ],
    weight: 270,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Explanation',
      pages: 196,
      size: '5.5x8.5 inches',
      description: 'A detailed study of the Mundaka Upanishad, which contains profound teachings about Brahman and the path to spiritual realization.'
    }
  },
  {
    id: 'slrspt-book-006',
    title: 'Kenopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 225,
    discount: 0, // No discount
    images: [
      'image/book6/book1.jpg',
      'image/book6/book2.jpg',
      'image/book6/book3.jpg',
      'image/book6/book4.jpg',
      'image/book6/book5.jpg'
    ],
    weight: 390,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Explanation',
      pages: 244,
      size: '6x9 inches',
      description: 'A comprehensive study of the Kenopanishad with original text and detailed commentary exploring the nature of knowledge and consciousness.'
    }
  },
  {
    id: 'slrspt-book-007',
    title: 'Mandukyopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 400,
    discount: 30, // 30% discount
    images: [
      'image/book7/book1.jpg',
      'image/book7/book2.jpg',
      'image/book7/book3.jpg',
      'image/book7/book4.jpg',
      'image/book7/book5.jpg'
    ],
    weight: 790,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Explanation',
      pages: 592,
      size: '6x9 inches',
      description: 'An extensive commentary on the Mandukya Upanishad, which contains the essence of the Vedanta philosophy and explores the states of consciousness.'
    }
  },
  {
    id: 'slrspt-book-008',
    title: 'Aitareyopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 160,
    discount: 5, // 5% discount
    images: [
      'image/book8/book1.jpg',
      'image/book8/book2.jpg',
      'image/book8/book3.jpg',
      'image/book8/book4.jpg',
      'image/book8/book5.jpg'
    ],
    weight: 250,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 130,
      size: '5.5x8.5 inches',
      description: 'A study of the Aitareya Upanishad, which explores the nature of reality, consciousness, and the creation of the universe.'
    }
  },
  {
    id: 'slrspt-book-009',
    title: 'Prashnopanishad',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 175,
    discount: 0, // No discount
    images: [
      'image/book9/book1.jpg',
      'image/book9/book2.jpg',
      'image/book9/book3.jpg',
      'image/book9/book4.jpg',
      'image/book9/book5.jpg'
    ],
    weight: 270,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 156,
      size: '5.5x8.5 inches',
      description: 'A commentary on the Prashna Upanishad, which consists of six questions and their answers about the nature of reality and the supreme being.'
    }
  },
  {
    id: 'slrspt-book-010',
    title: 'Vedanta Samvatsara - 2 volumes',
    author: 'Smt Sudarsanam Ramasubrahmania Rajha',
    price: 410,
    discount: 15, // 15% discount
    images: [
      'image/book10/book1.jpg',
      'image/book10/book2.jpg',
      'image/book10/book3.jpg',
      'image/book10/book4.jpg',
      'image/book10/book5.jpg'
    ],
    weight: 700,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil Translation',
      pages: 850,
      size: '5.5x8.5 inches',
      description: 'A comprehensive two-volume set exploring Vedanta philosophy over the course of a year, with daily readings and detailed explanations.'
    }
  },
  {
    id: 'slrspt-book-011',
    title: 'Brahmasutra Sankara Bhasyam - 4 Volumes',
    author: 'Sri Gnananandabharati Swamigal',
    price: 1100,
    discount: 35,
    images: [
      'image/book11/book1.jpg',
      'image/book11/book2.jpg',
      'image/book11/book3.jpg',
      'image/book11/book4.jpg',
      'image/book11/book5.jpg'
    ],
    weight: 3200,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Explanation',
      pages: 2080,
      size: '6x9 inches',
      description: 'A comprehensive four-volume commentary on the Brahma Sutras by Adi Shankaracharya, with detailed Tamil explanations. This essential work explores the fundamental principles of Vedanta philosophy and provides deep insights into the nature of Brahman (ultimate reality).'
    }
  },
  {
    id: 'slrspt-book-012',
    title: 'Anubootiprakasam',
    author: 'Sri Gnananandabharati Swamigal',
    price: 500,
    discount: 40,
    images: [
      'image/book12/book1.jpg',
      'image/book12/book2.jpg',
      'image/book12/book3.jpg',
      'image/book12/book4.jpg',
      'image/book12/book5.jpg'
    ],
    weight: 980,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 180,
      size: '5.5x8.5 inches',
      description: 'A profound spiritual text that illuminates the path to self-realization and direct experience of the divine. This work guides seekers through the stages of spiritual awakening and the realization of one\'s true nature as consciousness itself.'
    }
  },
  {
    id: 'slrspt-book-013',
    title: 'Panchadasi - Sanskrit & English',
    author: 'Sri Gnananandabharati Swamigal',
    price: 280,
    discount: 10,
    images: [
      'image/book13/book1.jpg',
      'image/book13/book2.jpg',
      'image/book13/book3.jpg',
      'image/book13/book4.jpg',
      'image/book13/book5.jpg'
    ],
    weight: 480,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with English',
      pages: 421,
      size: '6x9 inches',
      description: 'A classical Vedanta text consisting of fifteen chapters that systematically expound the philosophy of non-dualism. This edition features the original Sanskrit verses with clear English translation and commentary, making it accessible to modern seekers of wisdom.'
    }
  },
  {
    id: 'slrspt-book-014',
    title: 'Panchadasi - Sanskrit & Tamil',
    author: 'Sri Gnananandabharati Swamigal',
    price: 275,
    discount: 0,
    images: [
      'image/book14/book1.jpg',
      'image/book14/book2.jpg',
      'image/book14/book3.jpg',
      'image/book14/book4.jpg',
      'image/book14/book5.jpg'
    ],
    weight: 650,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 540,
      size: '5x7 inches',
      description: 'The renowned Panchadasi text with original Sanskrit verses and detailed Tamil explanation. This work beautifully presents the essence of Advaita Vedanta through fifteen chapters that explore consciousness, reality, and the path to liberation.'
    }
  },
  {
    id: 'slrspt-book-015',
    title: 'Samskruta Pathamala - Sanskrit & Tamil',
    author: 'Sri Sringeri Muth',
    price: 200,
    discount: 25,
    images: [
      'image/book15/book1.jpg',
      'image/book15/book2.jpg',
      'image/book15/book3.jpg',
      'image/book15/book4.jpg',
      'image/book15/book5.jpg'
    ],
    weight: 550,
    specs: {
      publisher: 'Dakshinamnaya Sri Sringeri Sharada Peedam',
      language: 'Sanskrit to Tamil',
      pages: 497,
      size: '5.5x8.5 inches',
      description: 'An excellent beginner\'s guide to learning Sanskrit through Tamil. This instructional book provides a systematic approach to understanding Sanskrit grammar, vocabulary, and sentence structure, making the ancient language accessible to Tamil-speaking students.'
    }
  },
  {
    id: 'slrspt-book-016',
    title: 'Sankara Digvijayam - Sanskrit',
    author: 'Sri Vidyaranya Swamigal',
    price: 400,
    discount: 0,
    images: [
      'image/book16/book1.jpg',
      'image/book16/book2.jpg',
      'image/book16/book3.jpg',
      'image/book16/book4.jpg',
      'image/book16/book5.jpg'
    ],
    weight: 660,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit',
      pages: 175,
      size: '6x9 inches',
      description: 'The traditional biography of Adi Shankaracharya that chronicles his spiritual journey, philosophical debates, and establishment of the four mathas (monasteries). This Sanskrit text celebrates the life and teachings of the great Advaita philosopher who revived Vedic wisdom in India.'
    }
  },
  {
    id: 'slrspt-book-017',
    title: 'Sri Sankara Stotrani / Grandavali - Sanskrit',
    author: 'Sri Sringeri Muth',
    price: 180,
    discount: 30,
    images: [
      'image/book17/book1.jpg',
      'image/book17/book2.jpg',
      'image/book17/book3.jpg',
      'image/book17/book4.jpg',
      'image/book17/book5.jpg'
    ],
    weight: 770,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit',
      pages: 466,
      size: '6x9 inches',
      description: 'A comprehensive collection of devotional hymns and prayers composed by Adi Shankaracharya. This volume includes famous stotras such as Bhaja Govindam, Soundarya Lahari, and many others that express devotion, wisdom, and the philosophy of non-dualism.'
    }
  },
  {
    id: 'slrspt-book-018',
    title: 'Sri Gurutattva Prakasika',
    author: 'Tharamangalam Subramania Sastrigal',
    price: 80,
    discount: 5,
    images: [
      'image/book18/book1.jpg',
      'image/book18/book2.jpg',
      'image/book18/book3.jpg',
      'image/book18/book4.jpg',
      'image/book18/book5.jpg'
    ],
    weight: 120,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 116,
      size: '5.5x8.5 inches',
      description: 'An illuminating text on the significance of the guru (spiritual teacher) in the path of spiritual evolution. This work explores the guru-disciple relationship, the qualities of a true guru, and the importance of grace in attaining self-realization.'
    }
  },
  {
    id: 'slrspt-book-019',
    title: 'Sri Jagadguru Charidamrutam',
    author: 'Sri Bhashya Swamigal',
    price: 180,
    discount: 0,
    images: [
      'image/book19/book1.jpg',
      'image/book19/book2.jpg',
      'image/book19/book3.jpg',
      'image/book19/book4.jpg',
      'image/book19/book5.jpg'
    ],
    weight: 540,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 353,
      size: '5.5x8.5 inches',
      description: 'A biographical work celebrating the lives and teachings of the Jagadgurus (world teachers) of the Sringeri Sharada Peetham. This book documents their spiritual wisdom, compassionate guidance, and contributions to preserving Sanatana Dharma.'
    }
  },
  {
    id: 'slrspt-book-020',
    title: 'Sri Jagadguru Grandamala - 10 Volumes',
    author: 'Sri Sringeri Muth',
    price: 1860,
    discount: 10,
    images: [
      'image/book20/book1.jpg',
      'image/book20/book2.jpg',
      'image/book20/book3.jpg',
      'image/book20/book4.jpg',
      'image/book20/book5.jpg'
    ],
    weight: 5100,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit with Tamil Translation',
      pages: 3837,
      size: '5.4x8.5 inches',
      description: 'An extensive ten-volume collection of works by the successive Jagadgurus of Sringeri Sharada Peetham. This comprehensive set includes philosophical treatises, devotional compositions, commentaries on sacred texts, and guidance for spiritual practice, representing centuries of wisdom from one of India\'s most revered spiritual lineages.'
    }
  },
  {
    id: 'slrspt-book-021',
    title: 'Jagadguru Grandamala Part-01 (Ganapathy & Murugan Stotrangal)',
    author: 'Sri Sringeri Muth',
    price: 75,
    discount: 10,
    images: [
      'image/book21/book1.jpg',
      'image/book21/book2.jpg',
      'image/book21/book3.jpg',
      'image/book21/book4.jpg',
      'image/book21/book5.jpg'
    ],
    weight: 200,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 150,
      size: '5.4x8.3 inches',
      description: 'The first volume in the Jagadguru Grandamala series featuring devotional hymns dedicated to Lord Ganapathy and Lord Murugan. This collection includes powerful stotras (prayers) that invoke the blessings of these revered deities for removing obstacles and bestowing wisdom and courage.'
    }
  },
  {
    id: 'slrspt-book-022',
    title: 'Jagadguru Grandamala Part-02 (Devi Stotram & Sowndaryalahari)',
    author: 'Sri Sringeri Muth',
    price: 150,
    discount: 0,
    images: [
      'image/book22/book1.jpg',
      'image/book22/book2.jpg',
      'image/book22/book3.jpg',
      'image/book22/book4.jpg',
      'image/book22/book5.jpg'
    ],
    weight: 390,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 245,
      size: '5.4x8.3 inches',
      description: 'The second volume dedicated to the Divine Mother, featuring Devi Stotrams and the magnificent Soundarya Lahari. This collection includes sublime hymns that celebrate the beauty, power, and grace of the Goddess, with detailed explanations of their spiritual significance and metaphysical meanings.'
    } 
  },
  {
    id: 'slrspt-book-023',
    title: 'Jagadguru Grandamala Part-03 (Vivekachoodamani)',
    author: 'Sri Gnananandabharati Swamigal',
    price: 225,
    discount: 10,
    images: [
      'image/book23/book1.jpg',
      'image/book23/book2.jpg',
      'image/book23/book3.jpg',
      'image/book23/book4.jpg',
      'image/book23/book5.jpg'
    ],
    weight: 410,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 338,
      size: '5.4x8.3 inches',
      description: 'The third volume presenting the classic Vedanta text "Vivekachudamani" (Crest Jewel of Discrimination) attributed to Adi Shankaracharya. This profound work explores the discrimination between the real and unreal, the nature of the Self, and the path to liberation through knowledge and detachment.'
    }
  },
  {
    id: 'slrspt-book-024',
    title: 'Jagadguru Grandamala Part-04 (Sri Lalitha Trisati Sthotram)',
    author: 'Sri Bhashya Swamigal',
    price: 160,
    discount: 0,
    images: [
      'image/book24/book1.jpg',
      'image/book24/book2.jpg',
      'image/book24/book3.jpg',
      'image/book24/book4.jpg',
      'image/book24/book5.jpg'
    ],
    weight: 560,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 370,
      size: '5.4x8.3 inches',
      description: 'The fourth volume featuring the powerful Sri Lalitha Trisati Stotram, a hymn of 300 names praising the Divine Mother Lalitha Tripurasundari. This sacred text is revered in Shakta tradition and is known for its spiritual potency and mystical significance in worship and meditation.'
    }
  },
  {
    id: 'slrspt-book-025',
    title: 'Jagadguru Grandamala Part-05 (Sri Shiva Sthotrangal)',
    author: 'Sri Sringeri Muth',
    price: 170,
    discount: 15,
    images: [
      'image/book25/book1.jpg',
      'image/book25/book2.jpg',
      'image/book25/book3.jpg',
      'image/book25/book4.jpg',
      'image/book25/book5.jpg'
    ],
    weight: 530,
    specs: {
      publisher: 'Dakshinamnaya Sri Sringeri Sharada Peedam',
      language: 'Sanskrit to Tamil',
      pages: 376,
      size: '5.4x8.3 inches',
      description: 'The fifth volume dedicated to Lord Shiva, featuring a collection of powerful stotras and hymns praising the Supreme Destroyer and Transformer. This compilation includes devotional prayers that express reverence for Shiva\'s various forms, attributes, and cosmic functions in Hindu philosophy.'
    }
  },
  {
    id: 'slrspt-book-026',
    title: 'Jagadguru Grandamala Part-06 (Sri Vishnu Sthotrangal)',
    author: 'Sri Sringeri Muth',
    price: 200,
    discount: 0,
    images: [
      'image/book26/book1.jpg',
      'image/book26/book2.jpg',
      'image/book26/book3.jpg',
      'image/book26/book4.jpg',
      'image/book26/book5.jpg'
    ],
    weight: 625,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 476,
      size: '5.4x8.3 inches',
      description: 'The sixth volume devoted to Lord Vishnu, featuring a comprehensive collection of stotras praising the Preserver and Protector of the universe. This compilation includes hymns dedicated to Vishnu\'s various avatars and forms, celebrating his divine qualities, cosmic functions, and compassionate nature.'
    }
  },
  {
    id: 'slrspt-book-027',
    title: 'Jagadguru Grandamala Part-07 (Vedanta Prakaranangal-1)',
    author: 'Sri Sringeri Muth',
    price: 200,
    discount: 20,
    images: [
      'image/book27/book1.jpg',
      'image/book27/book2.jpg',
      'image/book27/book3.jpg',
      'image/book27/book4.jpg',
      'image/book27/book5.jpg'
    ],
    weight: 615,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 465,
      size: '5.4x8.3 inches',
      description: 'The seventh volume beginning the Vedanta Prakaranangal series, featuring foundational texts and treatises on Advaita Vedanta philosophy. This part includes essential works that explore the nature of reality, consciousness, and the path to self-realization through the lens of non-dual wisdom.'
    }
  },
  {
    id: 'slrspt-book-028',
    title: 'Jagadguru Grandamala Part-08 (Vedanta Prakaranangal-2)',
    author: 'Sri Sringeri Muth',
    price: 220,
    discount: 5,
    images: [
      'image/book28/book1.jpg',
      'image/book28/book2.jpg',
      'image/book28/book3.jpg',
      'image/book28/book4.jpg',
      'image/book28/book5.jpg'
    ],
    weight: 560,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 472,
      size: '5.4x8.3 inches',
      description: 'The eighth volume continuing the Vedanta Prakaranangal series, featuring intermediate texts on Advaita Vedanta philosophy. This part delves deeper into the concepts of Maya, Brahman, and the nature of the individual self, providing detailed explanations and commentaries on key Vedantic principles.'
    }
  },
  {
    id: 'slrspt-book-029',
    title: 'Jagadguru Grandamala Part-09 (Vedanta Prakaranangal-3)',
    author: 'Sri Sringeri Muth',
    price: 160,
    discount: 0,
    images: [
      'image/book29/book1.jpg',
      'image/book29/book2.jpg',
      'image/book29/book3.jpg',
      'image/book29/book4.jpg',
      'image/book29/book5.jpg'
    ],
    weight: 475,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 349,
      size: '5.4x8.3 inches',
      description: 'The ninth volume advancing the Vedanta Prakaranangal series, featuring advanced texts on Advaita Vedanta philosophy. This part explores sophisticated concepts of non-duality, the nature of liberation, and the practical application of Vedantic wisdom in daily life and spiritual practice.'
    }
  },
  {
    id: 'slrspt-book-030',
    title: 'Jagadguru Grandamala Part-10 (Vedanta Prakaranangal-4)',
    author: 'Sri Sringeri Muth',
    price: 300,
    discount: 5,
    images: [
      'image/book30/book1.jpg',
      'image/book30/book2.jpg',
      'image/book30/book3.jpg',
      'image/book30/book4.jpg',
      'image/book30/book5.jpg'
    ],
    weight: 710,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 593,
      size: '5.4x8.3 inches',
      description: 'The tenth and final volume completing the Vedanta Prakaranangal series, featuring comprehensive texts that represent the culmination of Advaita Vedanta philosophy. This concluding part offers profound insights into the ultimate reality, self-realization, and the integration of Vedantic wisdom into all aspects of life and spiritual practice.'
    }
  },
  {
    id: 'slrspt-book-031',
    title: 'Vaiyasika Nyayamala',
    author: 'Sri Gnananandabharati Swamigal',
    price: 150,
    discount: 10,
    images: [
      'image/book31/book1.jpg',
      'image/book31/book2.jpg',
      'image/book31/book3.jpg',
      'image/book31/book4.jpg',
      'image/book31/book5.jpg'
    ],
    weight: 630,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 395,
      size: '5.4x8.3 inches',
      description: 'An illuminating exposition on Vaiśeṣika philosophy, one of the six orthodox schools of Hindu philosophy. This work systematically explores the nature of reality through its unique categorization of the universe into seven fundamental padārthas (categories). Essential reading for students of Indian philosophy seeking to understand the atomic theory of Hinduism and its analytical approach to metaphysical concepts.'
    }
  },
  {
    id: 'slrspt-book-032',
    title: 'Sri Desikastakam',
    author: 'K.S. Venkatrama Sastrigal',
    price: 110,
    discount: 0,
    images: [
      'image/book32/book1.jpg',
      'image/book32/book2.jpg',
      'image/book32/book3.jpg',
      'image/book32/book4.jpg',
      'image/book32/book5.jpg'
    ],
    weight: 270,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 115,
      size: '5.4x8.3 inches',
      description: 'A devotional masterpiece containing eight powerful hymns (aṣṭakam) composed in praise of Sri Vedanta Desika, the renowned Sri Vaishnava philosopher-saint. These poetic verses capture the essence of Desika\'s spiritual grandeur, philosophical contributions, and divine grace. Includes word-to-word meaning and detailed explanations making it accessible to both scholars and devotees seeking inspiration from this great acharya.'
    } 
  },
  {
    id: 'slrspt-book-033',
    title: 'Sri Sankarajayanti Poojakalpam',
    author: 'Sri Bhashya Swamigal',
    price: 140,
    discount: 10,
    images: [
      'image/book33/book1.jpg',
      'image/book33/book2.jpg',
      'image/book33/book3.jpg',
      'image/book33/book4.jpg',
      'image/book33/book5.jpg'
    ],
    weight: 210,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 144,
      size: '5.4x8.3 inches',
      description: 'A comprehensive guide to performing special pujas and rituals in honor of Adi Shankaracharya\'s Jayanti celebrations. This practical manual provides detailed instructions, mantras, and procedures for conducting worship ceremonies that commemorate the birth of the great advaita philosopher. An invaluable resource for temples, spiritual organizations, and devotees wishing to properly observe this significant occasion in the spiritual calendar.'
    }
  },
  {
    id: 'slrspt-book-034',
    title: 'Pranava Deepam',
    author: 'Sringeri Math',
    price: 40,
    discount: 0,
    images: [
      'image/book34/book1.jpg',
      'image/book34/book2.jpg',
      'image/book34/book3.jpg',
      'image/book34/book4.jpg',
      'image/book34/book5.jpg'
    ],
    weight: 80,
    specs: {
      publisher: 'Smt Lingammal Ramaraju Shastraprathista Trust',
      language: 'Sanskrit and Tamil',
      pages: 60,
      size: '5.4x8.3 inches',
      description: 'An illuminating guide to the sacred syllable "Om" (Pranava), exploring its profound significance in Hindu philosophy, meditation practices, and spiritual awakening. This concise yet powerful text reveals the esoteric meanings behind the primordial sound, its vibrational qualities, and its role as a vehicle for transcendental consciousness. Essential for practitioners of meditation and those seeking to understand the foundation of Vedic chanting.'
    }
  },
  {
    id: 'slrspt-book-035',
    title: 'Tattvamasi Mahavakya Upadesam',
    author: 'Sringeri Muth',
    price: 40,
    discount: 5,
    images: [
      'image/book35/book1.jpg',
      'image/book35/book2.jpg',
      'image/book35/book3.jpg',
      'image/book35/book4.jpg',
      'image/book35/book5.jpg'
    ],
    weight: 85,
    specs: {
      publisher: 'Dakshinamnaya Sri Sringeri Sharada Peedam',
      language: 'Sanskrit to Tamil',
      pages: 76,
      size: '5.4x8.3 inches',
      description: 'A profound exploration of the great Mahāvākya "Tat Tvam Asi" (Thou Art That) from the Chandogya Upanishad. This authoritative text from the Sringeri tradition elucidates the essential Vedantic teaching of non-duality and the identity of the individual self (jīvātman) with the ultimate reality (Brahman). Includes traditional commentary and practical guidance for contemplation and self-realization.'
    }
  }
];

// Export for Backend (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { books };
}

// Export for Frontend (Browser)
if (typeof window !== 'undefined') {
  window.bookData = books;
}