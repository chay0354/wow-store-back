// Starting catalogue. Prices in ILS. `shape`/`color`/`cap` drive the SVG placeholder art
// in the front end until real product photos are added (`image` field).
export const SEED_PRODUCTS = [
  { id: 1, name: 'ספריי רב-תכליתי לימון', meta: '750 מ״ל · לכל המשטחים', category: 'kitchen', price: 19.9, was: 24.9, shape: 'spray', color: 'lemon', cap: 'brand', popularity: 1, info: ['מסיר שומן וכתמים מכל משטח', 'בטוח לשיש, עץ ופורמייקה', 'ריח לימון טבעי'] },
  { id: 2, name: 'ג׳ל כביסה אקולוגי', meta: '2 ליטר · 40 כביסות', category: 'laundry', green: true, price: 42, shape: 'jug', color: 'lime', cap: 'brand', popularity: 2, info: ['מתאים לכביסה צבעונית ולבנה', 'יעיל גם ב-30 מעלות', 'אריזה ממוחזרת'] },
  { id: 3, name: 'מסיר אבנית לאמבטיה', meta: '500 מ״ל · פעולה מהירה', category: 'bath', isNew: true, price: 27.5, shape: 'spray', color: 'cta', cap: 'brand', popularity: 5, info: ['מסיר אבנית מברזים וזכוכית תוך 2 דקות', 'לא פוגע בכרום ובניקל', 'ללא אדים חריפים'] },
  { id: 4, name: 'נוזל כלים מרוכז', meta: '1 ליטר · נענע ולימון', category: 'kitchen', price: 12.9, shape: 'pump', color: 'sky', cap: 'brand', popularity: 3, info: ['טיפה אחת לכיור שלם', 'עדין לידיים', 'מסיר שומן גם במים קרים'] },
  { id: 5, name: 'נוזל לניקוי רצפות', meta: '1.5 ליטר · ריח פריחה', category: 'floor', price: 16.9, was: 21.9, shape: 'jug', color: 'cta', cap: 'lemon', popularity: 4, info: ['לקרמיקה, פרקט ושיש', 'לא משאיר סימנים', 'ריח שנשאר שעות'] },
  { id: 6, name: 'מרכך כביסה בושם כותנה', meta: '3 ליטר · 60 כביסות', category: 'laundry', price: 29.9, was: 39.9, shape: 'jug', color: 'sky', cap: 'brand', popularity: 6, info: ['בגדים רכים ונעימים', 'מפחית קמטים', '1+1 עד סוף החודש'] },
  { id: 7, name: 'ספריי ניקוי זכוכית', meta: '750 מ״ל · ללא פסים', category: 'bath', price: 14.9, shape: 'spray', color: 'sky', cap: 'brand', popularity: 7, info: ['לחלונות, מראות ומקלחונים', 'מתייבש בלי פסים', 'מתאים גם לנירוסטה'] },
  { id: 8, name: 'אבקת ניקוי למשטחים קשים', meta: '450 גרם · עם סודה לשתייה', category: 'kitchen', green: true, price: 18.5, shape: 'tub', color: 'lime', cap: 'brand', popularity: 9, info: ['לכיורים, כיריים ואמבטיות', 'ללא כלור', 'מבוסס על מינרלים טבעיים'] },
  { id: 9, name: 'ג׳ל לאסלה אקונומיקה', meta: '750 מ״ל · מחטא', category: 'bath', price: 11.9, shape: 'pump', color: 'cta', cap: 'lime', popularity: 8, info: ['מחטא ומסיר כתמים', 'צוואר מעוקל לשוליים', 'ריח אורן'] },
  { id: 10, name: 'מבריק לפרקט ועץ', meta: '1 ליטר · מגן ומזין', category: 'floor', green: true, isNew: true, price: 34.9, shape: 'jug', color: 'lemon', cap: 'brand', popularity: 11, info: ['מחזיר ברק לפרקט', 'שכבת הגנה מפני שריטות', 'על בסיס שמן פשתן'] },
  { id: 11, name: 'טבליות למדיח כלים', meta: '50 יחידות · הכול באחת', category: 'kitchen', price: 49.9, was: 59.9, shape: 'tub', color: 'cta', cap: 'lemon', popularity: 10, info: ['ניקוי, הברקה ומלח בטבליה אחת', 'עטיפה נמסה, בלי לפתוח', 'מונע כתמי מים'] },
  { id: 12, name: 'מסיר כתמים לכביסה', meta: '500 מ״ל · אנזימטי', category: 'laundry', green: true, price: 22.9, shape: 'spray', color: 'lime', cap: 'brand', popularity: 12, info: ['לכתמי יין, קפה ודשא', 'בטוח לבדים צבעוניים', 'פועל תוך 5 דקות'] },
];

// The "full home kit" bundle: when all these ids are in the cart, each full set costs BUNDLE_PRICE.
export const BUNDLE = { productIds: [1, 4, 3, 5, 2], price: 99 };
