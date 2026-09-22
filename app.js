const details = {
  give_up: { title: 'Go with Give Up (RM315).', button: 'Go with Give Up (RM315)', summary: 'This closes the chapter at the lowest cost. It fits a practical decision when the plate does not carry enough future value to justify spending more.', reasons: ['Lowest cost, lowest hassle', 'Frees up money for what matters to you', 'A practical choice for your situation'] },
  interchange: { title: 'Go with Interchange (RM1.6k).', button: 'Interchange (RM1.6k)', summary: 'Keeping XX3218 makes sense when it matters personally and you have a clear future vehicle for it. You retain the plate without buying a motorcycle only for it.', reasons: ['Keeps XX3218 in your life', 'Avoids buying a vehicle for the plate', 'Makes room for a future vehicle plan'] },
  buy_motorcycle: { title: 'Go with Buy Motorcycle (RM3.7k).', button: 'Buy Motorcycle (RM3.7k)', summary: 'This fits only when the motorcycle itself is part of your plan. You get two wheels and keep XX3218, rather than creating a purchase solely for the plate.', reasons: ['You genuinely want the motorcycle', 'Keeps the plate with a purpose', 'Turns the choice into a new experience'] }
};

const title = document.querySelector('#take-title');
const summary = document.querySelector('#take-summary');
const reasons = document.querySelector('#reasons');
const action = document.querySelector('#go-button');
const take = document.querySelector('.take');
const optionButtons = [...document.querySelectorAll('.option')];
let activePersona = document.querySelector('.persona').dataset.persona;

function selectOption(option) {
  optionButtons.forEach((button) => {
    const selected = button.dataset.option === option;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  take.dataset.option = option;
}

function show(option, loading = false) {
  const item = details[option];

  if (loading) {
    take.classList.add('is-thinking');
    optionButtons.forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
  } else {
    take.classList.remove('is-thinking');
    selectOption(option);
  }

  title.textContent = loading ? 'Thinking it through…' : item.title;
  summary.textContent = loading ? 'Your chosen persona is weighing the three options for XX3218.' : item.summary;
  reasons.innerHTML = (loading
    ? ['Comparing cost with personal value', 'Matching the choice to your priorities', 'Getting a typed decision from Jev']
    : item.reasons
  ).map((reason) => `<li>${reason}</li>`).join('');
  action.innerHTML = loading ? 'Deciding…' : item.button + ' <span>→</span>';
  action.disabled = loading;
}

async function decide() {
  show('give_up', true);
  try {
    const key = await getOpenRouterKey();
    if (!key) throw new Error('No OPENROUTER_API_KEY was provided.');

    const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'typesafe/jev-1.13',
        state: {
          plate: 'XX3218',
          persona: activePersona,
          options: {
            give_up: 'Pay RM315 to give up the plate. Lowest cost and no further ownership.',
            interchange: 'Pay RM1,600 to retain XX3218 and move it to another vehicle.',
            buy_motorcycle: 'Pay RM3,700 to buy a motorcycle mainly to keep XX3218.'
          }
        },
        questions: {
          recommendation: {
            type: 'choice',
            instructions: 'Which option is the soundest decision for this persona? Choose the one matching their stated priority, while avoiding unnecessary cost.',
            criteria: {
              give_up: 'Best for a practical, low-cost buyer who does not strongly value retaining this particular plate.',
              interchange: 'Best for someone who values keeping the plate and has a suitable future vehicle.',
              buy_motorcycle: 'Best only for someone who genuinely wants a motorcycle and values this plate enough to justify the purchase.'
            }
          },
          attachment: {
            type: 'noul',
            instructions: 'Does this persona have a strong personal attachment to retaining the XX3218 plate?',
            criteria: { true: 'They clearly value retaining XX3218 for personal reasons.', false: 'They do not express a meaningful attachment to the plate.' }
          }
        }
      })
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { throw new Error(`The decision service returned an invalid response (${response.status}).`); }

    if (!response.ok) throw new Error(data.error || 'The decision request could not complete.');

    const recommendation = data.answers?.recommendation?.choice;
    if (!details[recommendation]) throw new Error('The decision service returned no valid recommendation.');

    show(recommendation);
  } catch (error) {
    take.classList.remove('is-thinking');
    title.textContent = 'Couldn’t reach the decision service.';
    summary.textContent = error.message + ' Add OPENROUTER_API_KEY to .env, window.OPENROUTER_API_KEY, or the browser prompt.';
    reasons.innerHTML = '<li>Your persona choice is still selected</li><li>Set OPENROUTER_API_KEY in .env, then try again</li>';
    action.innerHTML = 'Try again <span>↻</span>';
    action.disabled = false;
  }
}

async function getOpenRouterKey() {
  if (window.OPENROUTER_API_KEY) return window.OPENROUTER_API_KEY;

  const saved = localStorage.getItem('OPENROUTER_API_KEY');
  if (saved) return saved;

  try {
    const env = await fetch('.env', { cache: 'no-store' });
    if (env.ok) {
      const match = (await env.text()).match(/^OPENROUTER_API_KEY=(.+)$/m);
      if (match?.[1]?.trim()) return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch {}

  const entered = window.prompt('Enter your OpenRouter API key for this browser session:');
  if (entered?.trim()) {
    localStorage.setItem('OPENROUTER_API_KEY', entered.trim());
    return entered.trim();
  }
  return '';
}

document.querySelectorAll('.persona').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.persona').forEach((item) => {
    item.classList.remove('selected');
    item.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('selected');
  button.setAttribute('aria-pressed', 'true');
  activePersona = button.dataset.persona;
  decide();
}));

optionButtons.forEach((button) => button.addEventListener('click', () => show(button.dataset.option)));
action.addEventListener('click', decide);

show('give_up');
