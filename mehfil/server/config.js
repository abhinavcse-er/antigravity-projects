require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  moods: {
    love: {
      id: 'love',
      name: 'Love',
      hindiName: 'इश्क़',
      title: 'LOVE',
      quote: '“Pyaar ke gaane, dil se dil tak.”',
      action: 'WHY LOVE?',
      accentColor: '#ff4f70',
      accentColor2: '#ff9a68',
      description: 'Soul-stirring romantic melodies for the heart in love.',
      searchQuery: 'Hindi romantic Bollywood love songs audio'
    },
    dard: {
      id: 'dard',
      name: 'Dard',
      hindiName: 'दर्द',
      title: 'DARD',
      quote: '“Kuch gaane, dil ko halka kar dete hain.”',
      action: 'WHY DARD?',
      accentColor: '#8d7aff',
      accentColor2: '#6385ff',
      description: 'Poignant melancholy and heartbreak tunes that understand your silence.',
      searchQuery: 'Hindi sad Bollywood heartbreak songs audio'
    },
    sukoon: {
      id: 'sukoon',
      name: 'Sukoon',
      hindiName: 'सुकून',
      title: 'SUKOON',
      quote: '“Thoda ruk jao, duniya kahin nahi ja rahi.”',
      action: 'WHY SUKOON?',
      accentColor: '#e7c46a',
      accentColor2: '#a6d6b4',
      description: 'Gentle, acoustic, peaceful rhythms to calm the wandering mind.',
      searchQuery: 'Hindi relaxing peaceful sufi acoustic songs audio'
    },
    safar: {
      id: 'safar',
      name: 'Safar',
      hindiName: 'सफ़र',
      title: 'SAFAR',
      quote: '“Raaste lambe ho, playlist chhoti nahi.”',
      action: 'WHY SAFAR?',
      accentColor: '#35b7ff',
      accentColor2: '#f2b85d',
      description: 'Breezy road-trip anthems for open highways and endless journeys.',
      searchQuery: 'Hindi road trip travel Bollywood songs audio'
    },
    happy: {
      id: 'happy',
      name: 'Happy',
      hindiName: 'ख़ुशी',
      title: 'HAPPY',
      quote: '“Aaj reason nahi, bas gaane chahiye.”',
      action: 'WHY HAPPY?',
      accentColor: '#ffb449',
      accentColor2: '#ff5f7a',
      description: 'High-energy celebration, nostalgic party beats, and pure joy.',
      searchQuery: 'Hindi Bollywood happy celebratory party songs'
    },
    'late-night': {
      id: 'late-night',
      name: 'Late Night',
      hindiName: 'रात',
      title: 'LATE NIGHT',
      quote: '“Raat lambi hai, baatein bhi honi chahiye.”',
      action: 'WHY LATE NIGHT?',
      accentColor: '#9c7aff',
      accentColor2: '#4f7dff',
      description: 'Midnight indie confessions, slow ghazals, and 2 AM contemplation.',
      searchQuery: 'Hindi late night chill indie lo-fi songs'
    }
  }
};

module.exports = config;
