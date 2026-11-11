/* ============================================================
   Everything you can change lives in this file.
   Photos go in the "photos" folder, sounds in the "audio" folder.
   Text marked "REPLACE" is a placeholder until you send the real thing.
   ============================================================ */
window.CONFIG = {
  herName: 'Priyanka',

  /* Opens the browser in full screen after she unlocks it (Android). */
  fullscreen: true,

  /* Screen 1: the locked envelope */
  lock: {
    question: 'Where did we first meet?', // REPLACE: a question only she knows
    // Answers that open it. Capitals, spaces and dots don't matter.
    // Left empty [] while testing, so any answer opens it.
    answers: [],
    hint: 'Think about the day you first saw my face 🙈',
  },

  /* Screen 2: the little note */
  intro: [
    'I made this little corner of the internet just for you.',
    'No rush. Read it slowly.',
  ],

  /* Screen 3: the swipe and your first chat */
  match: {
    photo: 'photos/me.svg', // REPLACE: your photo, e.g. 'photos/me.jpg'
    name: 'Your clingy one',
    bio: 'Loves cats. Loves you more.',
    chats: [
      // REPLACE with your real first messages from the app
      { from: 'me', text: 'Hey 👋' },
      { from: 'her', text: 'Hii 🙂' },
      { from: 'me', text: 'Okay, important question first. Cats or dogs?' },
      { from: 'her', text: 'Cats. Obviously 🐱' },
      { from: 'me', text: 'Perfect. We are going to get along.' },
    ],
    since: '2026-08-14T21:30:00+05:30', // REPLACE: the day you matched (shows a live counter)
  },

  /* Screen 4: the one time you met */
  meet: {
    photo: 'photos/met.svg', // REPLACE: a photo from that day
    date: 'the day we met', // REPLACE: e.g. '12 October 2026'
    lines: [
      "We've met only once so far.",
      "But I've replayed that day in my head a hundred times.",
    ],
  },

  /* Screen 5: "see yourself through my eyes" */
  eyes: {
    photo: 'photos/her.svg', // REPLACE: her prettiest photo
    herWords: "I'm not pretty.",
    newWords: 'The prettiest girl I know. 💗',
    lines: ['This is you, through my eyes.', 'Every single time.'],
  },

  /* Screen 6: little things I love about you (swipe cards) */
  reasons: [
    { art: 'lioness', title: "You're so strong.", text: 'You trust your own mind. You see a kitten. I see a lioness.' },
    { art: 'singer', title: 'Your voice.', text: 'The cutest sound I know. I could listen to you sing all day.' },
    { art: 'blush', title: 'That blush.', text: 'The way you blush when I look at you. (Tap her, I am looking right now.)' },
    { art: 'chalent', title: "And you're chalent.", text: 'Too smart. Too cute. Very dangerous combo.' },
    { art: 'clingy', title: 'Clingy, both of us.', text: 'You love my clinginess, and you are clingy with me too. So I am never letting go.', clingy: true },
  ],
  reasonsEnd: "And a hundred more that didn't fit on a card.",

  /* Screen 7: your voice note */
  voice: {
    title: 'Some things sound better out loud.',
    after: 'I meant every word.',
  },

  /* Screen 8: the question */
  question: {
    pre: 'One more thing…',
    text: 'Will you be the song I sing forever?',
    yes: 'Yes 💖',
    no: 'No',
  },

  /* Screen 9: after she says yes */
  final: {
    photo: 'photos/us.svg', // REPLACE: a photo of you two
    title: 'Best. Yes. Ever. 💖',
    line: 'Now look up. 🌹', // if you are not next to her, change to e.g. 'Now call me. 📞'
    sub: '…and sing one for me? 🎤',
    whatsapp: '', // optional: your number with country code, e.g. '919876543210', adds a "Tell him yes" button
  },

  /* Sounds. Missing files are fine: a soft music box plays instead. */
  music: {
    background: 'audio/song.mp3', // the ghazal that plays through the story
    final: 'audio/final-song.mp3', // plays after she says yes
    myVoice: 'audio/my-voice.mp3', // your voice note (screen 7)
    herVoice: 'audio/her-voice.mp3', // her singing, if you have one (adds a play button on the "Your voice" card)
  },
};
