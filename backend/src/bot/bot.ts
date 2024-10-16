// src/bot/bot.ts

import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { AppDataSource } from '../shared/database';
import { Todo } from '../shared/models/todo';
import { User } from '../shared/models/user';

const bot = new Telegraf(process.env.BOT_TOKEN || '');

// Helper function to get the current day of the week
function getCurrentDay(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

// Helper function to parse day input
function parseDay(input: string): string | null {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  input = input.toLowerCase();
  
  if (input === 'today' || input === 'now') return getCurrentDay();
  if (input === 'tomorrow') return days[(new Date().getDay() + 1) % 7];
  
  const fullDay = days.find(day => day.toLowerCase().startsWith(input));
  if (fullDay) return fullDay;
  
  const shortDay = shortDays.findIndex(day => day.toLowerCase().startsWith(input));
  if (shortDay !== -1) return days[shortDay];
  
  return null;
}

// Helper function to handle todo operations
async function handleTodoOperation(ctx: Context, day: string, operation: string, content?: string) {
  const todoRepository = AppDataSource.getRepository(Todo);
  const userRepository = AppDataSource.getRepository(User);

  const telegramId = ctx.from?.id.toString();
  if (!telegramId) {
    return ctx.reply('Error: Unable to identify user.');
  }

  const user = await userRepository.findOne({ where: { telegramId } });
  if (!user) {
    return ctx.reply('Error: User not found. Please use /start to register.');
  }

  switch (operation) {
    case 'add':
      if (!content) {
        return ctx.reply('Error: No content provided for the todo.');
      }
      const newTodo = todoRepository.create({ day, content, user });
      await todoRepository.save(newTodo);
      return ctx.reply(`Added todo for ${day}: ${content}`);
    
    case 'remove':
      if (!content) {
        return ctx.reply('Error: No content provided to remove.');
      }
      const todoToRemove = await todoRepository.findOne({ where: { day, content, user } });
      if (todoToRemove) {
        await todoRepository.remove(todoToRemove);
        return ctx.reply(`Removed todo for ${day}: ${content}`);
      } else {
        return ctx.reply(`Todo not found for ${day}: ${content}`);
      }
    
    case 'list':
    default:
      const todos = await todoRepository.find({ where: { day, user } });
      if (todos.length === 0) {
        return ctx.reply(`No todos for ${day}.`);
      }
      const todoList = todos.map(todo => `- ${todo.content}`).join('\n');
      return ctx.reply(`Todos for ${day}:\n${todoList}`);
  }
}

// Helper function to list all todos
async function listAllTodos(ctx: Context) {
  const todoRepository = AppDataSource.getRepository(Todo);
  const userRepository = AppDataSource.getRepository(User);

  const telegramId = ctx.from?.id.toString();
  if (!telegramId) {
    return ctx.reply('Error: Unable to identify user.');
  }

  const user = await userRepository.findOne({ where: { telegramId } });
  if (!user) {
    return ctx.reply('Error: User not found. Please use /start to register.');
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayIndex = new Date().getDay();
  const orderedDays = [...days.slice(currentDayIndex), ...days.slice(0, currentDayIndex)];

  let response = 'Your todos:\n\n';

  for (const day of orderedDays) {
    const todos = await todoRepository.find({ where: { day, user } });
    if (todos.length > 0) {
      response += `${day}:\n${todos.map(todo => `- ${todo.content}`).join('\n')}\n\n`;
    }
  }

  return ctx.reply(response.trim());
}

async function startTelegramBot() {
  // Start command
  bot.command('start', async (ctx) => {
    const userRepository = AppDataSource.getRepository(User);
    const telegramId = ctx.from.id.toString();
    const firstName = ctx.from.first_name;

    let user = await userRepository.findOne({ where: { telegramId } });
    if (!user) {
      user = userRepository.create({ telegramId, firstName });
      await userRepository.save(user);
    }

    ctx.reply(`Welcome to the Todo Bot, ${firstName}! You can manage your todos using commands like:\n\n/today add Buy groceries\n/tomorrow list\n/mon add Call mom\n/list`);
  });

  // Handle text messages
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text.toLowerCase();
    const [command, operation, ...contentArr] = text.split(' ');
    const content = contentArr.join(' ');

    const day = parseDay(command);
    if (day) {
      await handleTodoOperation(ctx, day, operation || 'list', content);
    } else if (command === '/list') {
      await listAllTodos(ctx);
    } else {
      ctx.reply('Invalid command. Try using /today, /tomorrow, /mon, /tue, etc., followed by add, remove, or list.');
    }
  });

  // Start the bot
  await bot.launch();

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

export { startTelegramBot };
