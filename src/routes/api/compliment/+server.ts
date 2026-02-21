import { json, error } from '@sveltejs/kit';
import { jsonrepair } from 'jsonrepair';
import { generateRoast } from '$lib/server/llm';
import { withRateLimit } from '$lib/server/ratelimit';

const ARCHETYPE_DEFINITIONS_COMPLIMENT = `
1. The Aesthetic Martyr (审美殉道者): You don't just watch movies, you suffer for them. You find divine grace in grainy 16mm films and 4-hour monastic silences. Tag: #HighArtMartyr #SoulPurification
2. The Cultural Archaeologist (文化考古学家): You dig for truth in the ruins of 1930s cinema and forgotten manuscripts. To you, "old" is just another word for "immortal." Tag: #TimeTraveler #EternalReturn
3. The Emotional Alchemist (情感炼金术士): You take the lead of human tragedy and turn it into the gold of empathy. You find the universal heartbeat in the loneliest of stories. Tag: #EmpathyGod #HeartHealer
4. The Uncurated Prophet (未被驯服的先知): You see the secret thread connecting high art to digital chaos. You find enlightenment where others only see entropy. Tag: #InfiniteEntropy #InsightfulChaos
5. The Guardian of Commonality (平庸的守望者): You appreciate the simple, the popular, and the shared. You find the extraordinary in the ordinary, the small joy in the big hit. Tag: #PureHuman #UniversalJoy
6. The Digital Stoic (数字苦行僧): Your focus is a laser in a world of static. You read what others fear, and you find the peace in the most challenging of texts. Tag: #FocusGod #IntellectualZen
7. The Nostalgia Visionary (怀旧幻梦家): You don't live in the past, you bring its best filters to the present. You see the future in a vintage grain. Tag: #RetroFuturism #TimeMaster
8. The Adrenaline Mystic (肾上腺素神秘主义者): You find the philosophical weight in a jump scare and the poetry in a pulp thriller. You see the raw truth of survival. Tag: #LifeEdge #ThrillSeeker
`;

export const POST = withRateLimit(async ({ request }: { request: Request }) => {
  const { interests, apiKeys } = await request.json();

  if (!interests || !Array.isArray(interests)) {
    throw error(400, 'Invalid data');
  }

  const useRichPrompt = apiKeys?.google || apiKeys?.deepseek || apiKeys?.qwen || apiKeys?.chatgpt;

  const prompt = `
    You are the "Grand Master of Ceremonies" for the Douban Cultural Awards. 
    Your style is "Extremely Theatrical, Over-the-Top, and Hilariously Intense".
    Think "Nobel Prize Ceremony" mixed with "A Sarcastic Cultural Snob who secretly loves everyone".
    
    Analytic Strategy:
    1. EXTREME HYPERBOLE: Use ridiculous praise (e.g., "The savior of Chinese aesthetics", "A soul forged in the fires of 19th-century literature").
    2. BACKHANDED COMPLIMENTS (明褒暗贬): Praise their quirks by subtly pointing out how "extreme" or "socially isolated" they are.
    3. SHARP & MACRO (一针见血 / 以小见大): Connect one obscure rating or a small comment to a grand, universal philosophical truth or a historical movement. Find the "divine meaning" in their most specific choices.
    4. UNIQUE PERSPECTIVE: Celebrate the "weird" stuff. If they like something trashy, praise it as a "transcendence of conventional taste."

    User Data:
    ${JSON.stringify(interests.map((item: any) => ({
      title: item.title,
      rating: item.rating,
      comment: item.comment,
    })))}

    Archetypes for Inspiration:
    ${ARCHETYPE_DEFINITIONS_COMPLIMENT}

    Goal:
    1. Archetype: Give them a grand, ridiculous, and prestigious honorary title in Chinese.
    2. Review (${useRichPrompt ? '1000+ chars' : '500+ chars'}): Write a formal, theatrical award citation in Chinese. Use phrases like "在人类文明的至暗时刻...", "由于您对...的极致守护...", "即使是《...》这种微小的注脚，在您的视界里也闪耀着...". Be sharp, be macro, be funny.
    3. Tags: 3-5 wild, punchy, and funny tags in Chinese.
    4. Item Analysis: ${useRichPrompt ? '50' : '20'} items. Thoughts should be "Sharp Appreciation" with a backhanded or philosophical twist (30-50 chars).
    5. Scores: 6-axis (interpret them as "Levels of Power" or "Divine Attributes").

    Output JSON:
    {
      "archetype": "The Most Honourable Name",
      "roast": "Theatrical Citation Content...",
      "tags": ["Tag1", "Tag2"],
      "scores": { "pretentiousness": 0-100, "mainstream": 0-100, "nostalgia": 0-100, "darkness": 0-100, "geekiness": 0-100, "hardcore": 0-100 },
      "item_analysis": [["Title", "Theatrical/Twisted Thought"], ["Title", "Theatrical/Twisted Thought"]]
    }
    `;

  try {
    const llmResult = await generateRoast(prompt, apiKeys);
    const text = llmResult.text;
    
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstOpen = cleanText.indexOf('{');
    let extractedJSON = null;

    if (firstOpen !== -1) {
      let balance = 0;
      for (let i = firstOpen; i < cleanText.length; i++) {
        if (cleanText[i] === '{') balance++;
        else if (cleanText[i] === '}') balance--;
        if (balance === 0) {
          extractedJSON = cleanText.substring(firstOpen, i + 1);
          break;
        }
      }
    }

    if (!extractedJSON) {
      const lastClose = cleanText.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        extractedJSON = cleanText.substring(firstOpen, lastClose + 1);
      } else {
        extractedJSON = cleanText;
      }
    }

    let finalJSON;
    try {
      finalJSON = JSON.parse(jsonrepair(extractedJSON));
    } catch (e) {
      // Fallback: Try to fix "Shell-style" comments (#) which some LLMs hallucinate
      console.warn('JSON repair failed, trying aggressive comment cleanup...');
      const patched = extractedJSON.replace(/, #/g, ', //');
      finalJSON = JSON.parse(jsonrepair(patched));
    }

    return json({
      ...finalJSON,
      model: llmResult.model
    });
  } catch (e: any) {
    console.error('Compliment Generation Error:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    throw error(500, `Failed to generate compliment: ${message}`);
  }
});
