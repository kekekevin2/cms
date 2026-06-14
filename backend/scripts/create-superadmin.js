require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const readline = require('readline');
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
const { dbConfig } = require('../config/db.config');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: dbConfig.pool,
  logging: false,
});

const User = require('../models/user.model')(sequelize, Sequelize);
const Admin = require('../models/admin.model')(sequelize, Sequelize);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (question, hidden = false) =>
  new Promise((resolve) => {
    if (hidden) {
      process.stdout.write(question);
      const stdin = process.openStdin();
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      let input = '';
      process.stdin.on('data', function handler(ch) {
        ch = ch.toString();
        if (ch === '\n' || ch === '\r' || ch === '\u0003') {
          if (ch === '\u0003') process.exit();
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          resolve(input);
        } else if (ch === '\u007f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(question + '*'.repeat(input.length));
          }
        } else {
          input += ch;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(question, resolve);
    }
  });

async function main() {
  console.log('\n=== Create Superadmin ===\n');

  try {
    await sequelize.authenticate();
    console.log('Database connected.\n');
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }

  const firstName = (await ask('First name: ')).trim();
  const middleName = (await ask('Middle name (leave blank to skip): ')).trim();
  const lastName = (await ask('Last name: ')).trim();
  const email = (await ask('Email: ')).trim();
  const contactNumber = (await ask('Contact number (leave blank to skip): ')).trim();

  let password, confirmPassword;
  do {
    password = await ask('Password: ', true);
    confirmPassword = await ask('Confirm password: ', true);
    if (password !== confirmPassword) {
      console.log('Passwords do not match. Try again.\n');
    }
  } while (password !== confirmPassword);

  rl.close();

  if (!firstName || !lastName || !email || !password) {
    console.error('First name, last name, email, and password are required.');
    process.exit(1);
  }

  const t = await sequelize.transaction();
  try {
    const existing = await User.findOne({ where: { email, role: 'superadmin' }, transaction: t });
    if (existing) {
      await t.rollback();
      console.error(`\nA superadmin with email "${email}" already exists.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create(
      { email, password: hashedPassword, role: 'superadmin', is_active: true },
      { transaction: t }
    );

    await Admin.create(
      {
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        email,
        contact_number: contactNumber || null,
        user_id: user.user_id,
      },
      { transaction: t }
    );

    await t.commit();
    console.log(`\nSuperadmin "${firstName} ${lastName}" created successfully.`);
  } catch (err) {
    await t.rollback();
    console.error('\nFailed to create superadmin:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
