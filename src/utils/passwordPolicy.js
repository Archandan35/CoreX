import settingsCache from '@/core/settingsCache.js';

const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '123456789', '1234567890', '1234567',
  '12345', '1234', '123', '12345678910', 'qwerty', 'qwerty123', 'qwertyuiop',
  '1q2w3e4r', '1qaz2wsx', 'qwertz', 'azerty', 'admin', 'administrator',
  'letmein', 'welcome', 'monkey', 'dragon', 'master', 'master123', 'sunshine',
  'princess', 'football', 'baseball', 'basketball', 'hockey', 'soccer',
  'charlie', 'donald', 'donald123', 'trustno1', 'passw0rd', 'passwd',
  'password1', 'password12', 'password123', 'Password', 'P@ssword',
  'passwrd', 'pa$$word', 'p@ssword', 'p@ssw0rd', 'pass123', 'pass1234',
  'pwd', 'pw123', 'secret', 'secret123', 'iloveyou', 'iloveyou123',
  'loveme', 'lovely', 'love123', 'flower', 'flower123', 'shadow',
  'shadow123', 'shadows', '123qwe', '123qweasd', 'qwe123', 'abc123',
  'abcd1234', 'abcdef', 'abcdefg', 'abcdefgh', 'test', 'test123',
  'test1234', 'guest', 'guest123', 'temp', 'temp123', 'default',
  'changeme', 'changeit', 'changethis', 'newuser', 'user', 'user123',
  'user1', 'user1234', 'login', 'login123', 'pass', 'pass12345',
  'hello', 'hello123', 'helloworld', 'world', 'world123', 'batman',
  'superman', 'spiderman', 'ironman', 'captain', 'wolverine', 'harry',
  'harrypotter', 'voldemort', 'starwars', 'jedi', 'yoda', 'chewbacca',
  'pokemon', 'pikachu', 'charizard', 'mario', 'luigi', 'peach',
  'nintendo', 'xbox', 'playstation', 'ps4', 'xbox360', 'minecraft',
  'fortnite', 'roblox', 'gta', 'gta123', 'callofduty', 'assassin',
  'naruto', 'sasuke', 'kakashi', 'itachi', 'goku', 'vegeta',
  'dragonball', 'onepiece', 'luffy', 'zoro', 'natsu', 'eren',
  'titan', 'aot', 'deathnote', 'light', 'kira', 'l123456',
  'fuckyou', 'fuckyou123', 'fuck', 'bitch', 'sex', 'sexy',
  'sexy123', 'hotstuff', 'hotdog', 'beauty', 'beautiful', 'pretty',
  'butterfly', 'butterfly1', 'crystal', 'crystal123', 'diamond', 'diamond1',
  'golden', 'gold123', 'silver', 'silver123', 'bronze', 'platinum',
  'summer', 'summer123', 'winter', 'winter123', 'spring', 'autumn',
  'jordan', 'jordan23', 'michael', 'mike', 'smith', 'andrew',
  'joshua', 'matthew', 'daniel', 'david', 'david123', 'james',
  'robert', 'john', 'john123', 'johnny', 'william', 'william1',
  'oliver', 'jack', 'jack123', 'jackson', 'thomas', 'thomas1',
  'chris', 'christopher', 'nick', 'nick123', 'alex', 'alex123',
  'alexander', 'ben', 'benjamin', 'sam', 'sam123', 'samuel',
  'max', 'max123', 'leo', 'leo123', 'kai', 'kai123',
  'noah', 'liam', 'liam123', 'mason', 'ethan', 'logan',
  'lucas', 'jason', 'jason123', 'justin', 'justin1', 'brian',
  'ryan', 'ryan123', 'kevin', 'kevin123', 'steven', 'scott',
  'brandon', 'tyler', 'tyler123', 'adam', 'adams', 'adrian',
  'gabriel', 'victor', 'victor123', 'martin', 'martin1', 'oscar',
  'george', 'george123', 'harry1', 'oliver1', 'charlie1', 'jack1',
  'alfie', 'riley', 'muhammad', 'mohammed', 'ahmed', 'ali',
  'ali123', 'hassan', 'hussain', 'omar', 'omar123', 'yusuf',
  'solo', 'soleil', 'star', 'starlight', 'moon', 'moonlight',
  'sun', 'sunny', 'sunny123', 'sky', 'sky123', 'skywalker',
  'rain', 'rainbow', 'rainbow1', 'cloud', 'cloudy', 'storm',
  'thunder', 'lightning', 'water', 'fire', 'fire123', 'earth',
  'wind', 'ocean', 'river', 'mountain', 'forest', 'tree123',
  'tiger', 'tiger123', 'lion', 'lion123', 'bear', 'bear123',
  'wolf', 'wolf123', 'eagle', 'hawk', 'falcon', 'phoenix',
  'rose', 'rose123', 'lily', 'lily123', 'daisy', 'daisy123',
  'angel', 'angel123', 'heaven', 'heaven1', 'paradise', 'destiny',
  'freedom', 'liberty', 'justice', 'peace', 'peace123', 'happy',
  'happiness', 'smile', 'smiley', 'laugh', 'laugh123',
]);

function validatePassword(password, options = {}) {
  const errors = [];

  const minLength = settingsCache.get('passwordMinLength') || 8;
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long.`);
  }

  if (settingsCache.get('passwordRequireUppercase') !== false && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }

  if (settingsCache.get('passwordRequireLowercase') !== false && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }

  if (settingsCache.get('passwordRequireNumber') !== false && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }

  if (settingsCache.get('passwordRequireSpecial') !== false && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a different one.');
  }

  if (options.username && password.toLowerCase().includes(options.username.toLowerCase())) {
    errors.push('Password cannot contain your username.');
  }

  if (options.email) {
    const localPart = options.email.split('@')[0];
    if (localPart.length >= 3 && password.toLowerCase().includes(localPart.toLowerCase())) {
      errors.push('Password cannot contain your email address.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export { validatePassword };
export default { validatePassword };