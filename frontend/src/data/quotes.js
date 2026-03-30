/**
 * data/quotes.js
 * ---------------
 * v1.1.0 — Finance Quote of the Day
 * Curated list of 30 finance, frugality, and wealth-building quotes.
 * One is picked at random each time the Dashboard mounts.
 */

export const FINANCE_QUOTES = [
  {
    text: "Do not save what is left after spending, but spend what is left after saving.",
    author: "Warren Buffett",
  },
  {
    text: "A budget is telling your money where to go instead of wondering where it went.",
    author: "Dave Ramsey",
  },
  {
    text: "Beware of little expenses. A small leak will sink a great ship.",
    author: "Benjamin Franklin",
  },
  {
    text: "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.",
    author: "Dave Ramsey",
  },
  {
    text: "It is not the man who has too little, but the man who craves more, that is poor.",
    author: "Seneca",
  },
  {
    text: "The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order.",
    author: "T.T. Munger",
  },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
  {
    text: "The secret to wealth is simple: find a way to do more for others than anyone else does.",
    author: "Tony Robbins",
  },
  {
    text: "Money is a terrible master but an excellent servant.",
    author: "P.T. Barnum",
  },
  {
    text: "Wealth consists not in having great possessions, but in having few wants.",
    author: "Epictetus",
  },
  {
    text: "The quickest way to double your money is to fold it in half and put it in your back pocket.",
    author: "Will Rogers",
  },
  {
    text: "Never spend your money before you have earned it.",
    author: "Thomas Jefferson",
  },
  {
    text: "You must gain control over your money or the lack of it will forever control you.",
    author: "Dave Ramsey",
  },
  {
    text: "Formal education will make you a living; self-education will make you a fortune.",
    author: "Jim Rohn",
  },
  {
    text: "The real measure of your wealth is how much you'd be worth if you lost all your money.",
    author: "Unknown",
  },
  {
    text: "Time is more valuable than money. You can get more money, but you cannot get more time.",
    author: "Jim Rohn",
  },
  {
    text: "Every time you borrow money, you're robbing your future self.",
    author: "Nathan W. Morris",
  },
  {
    text: "Don't tell me what you value. Show me your budget, and I'll tell you what you value.",
    author: "Joe Biden",
  },
  {
    text: "Frugality includes all the other virtues.",
    author: "Cicero",
  },
  {
    text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
    author: "Philip Fisher",
  },
  {
    text: "Spend less than you make, invest the rest, and be patient.",
    author: "JL Collins",
  },
  {
    text: "If you buy things you do not need, soon you will have to sell things you need.",
    author: "Warren Buffett",
  },
  {
    text: "It's not how much money you make, but how much money you keep.",
    author: "Robert Kiyosaki",
  },
  {
    text: "Money grows on the tree of patience.",
    author: "Japanese Proverb",
  },
  {
    text: "A penny saved is a penny earned.",
    author: "Benjamin Franklin",
  },
  {
    text: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett",
  },
  {
    text: "The art is not in making money, but in keeping it.",
    author: "Proverb",
  },
  {
    text: "Too many people spend money they haven't earned to buy things they don't want to impress people they don't like.",
    author: "Will Rogers",
  },
  {
    text: "Money is only a tool. It will take you wherever you wish, but it will not replace you as the driver.",
    author: "Ayn Rand",
  },
  {
    text: "Compound interest is the eighth wonder of the world.",
    author: "Albert Einstein (attr.)",
  },
]

/**
 * Returns a random quote from the list.
 * Call once on Dashboard mount for the daily quote.
 */
export function getRandomQuote() {
  const idx = Math.floor(Math.random() * FINANCE_QUOTES.length)
  return FINANCE_QUOTES[idx]
}
