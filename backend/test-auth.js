const authMiddleware = require('./middleware/authMiddleware');
console.log('Type of authMiddleware:', typeof authMiddleware);
console.log('Is function?', typeof authMiddleware === 'function');
console.log('authMiddleware:', authMiddleware);
