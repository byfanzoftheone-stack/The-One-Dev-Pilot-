const axios = require('axios');

const CLAUDE_FAST = 'claude-haiku-4-5-20251001';
const CLAUDE_QUALITY = 'claude-sonnet-4-6';

const callClaude = async (apiKey, prompt, model = CLAUDE_QUALITY, maxTokens = 4096) => {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    }
  );
  return res.data?.content?.[0]?.text || '';
};

const auditProject = async (apiKey, projectInfo, sourceContext) => {
  return callClaude(apiKey, `
You are a senior full-stack developer auditing a DevPilot project.

PROJECT: ${projectInfo.alias} (${projectInfo.repo_name})
STACK: Next.js 14/15 (Vercel) + Express (Railway/PostgreSQL) + Claude API
ARM64 Termux: NEVER suggest running next build locally.

SOURCE CODE CONTEXT:
${sourceContext}

Provide a concise audit in this exact format:

## Health Score
Vercel: X/10 | Railway: X/10 | Code Quality: X/10

## Critical Issues
[List only show-stopping issues, numbered]

## Quick Wins
[3 specific improvements that take < 30 min each]

## Missing Env Vars
[Any env vars referenced in code but likely not set]

## Recommended Next Steps
[2-3 concrete action items in priority order]
  `.trim(), CLAUDE_QUALITY);
};

const fixCode = async (apiKey, issueDescription, sourceContext, tsErrors = '') => {
  return callClaude(apiKey, `
Fix this Next.js/Express project issue.
STACK: Next.js 14/15 (Vercel) + Express (Railway) | ARM64: never run next build locally.
ISSUE: ${issueDescription}

TYPESCRIPT ERRORS:
${tsErrors || 'None'}

SOURCE:
${sourceContext}

Respond ONLY with:
--- FILE: relative/path/to/file ---
[complete corrected file content]
--- END FILE ---

=== SUMMARY ===
[Brief explanation of what was fixed and why]
  `.trim(), CLAUDE_QUALITY);
};

const chatAboutProject = async (apiKey, question, projectInfo, context = '') => {
  return callClaude(apiKey, `
You are DevPilot's AI co-pilot helping with: ${projectInfo.alias} (${projectInfo.repo_name})
Stack: Next.js 14/15 + Express + Railway + PostgreSQL + Claude API
ARM64 Termux constraint: never run next build locally.

${context ? `Project context:\n${context}\n` : ''}
Question: ${question}

Answer directly and concisely. If suggesting code changes, use:
--- FILE: path ---
[content]
--- END FILE ---
  `.trim(), CLAUDE_QUALITY);
};

const suggestUpgrades = async (apiKey, projectInfo, packageJson = '') => {
  return callClaude(apiKey, `
Suggest upgrade plan for DevPilot project: ${projectInfo.alias}
Stack: Next.js 14/15 + Express + PostgreSQL + Claude API

package.json: ${packageJson}

Give exactly 5 specific upgrade suggestions in this format:
UPGRADE-N: [title] | Priority: [HIGH/MED/LOW] | Effort: [min] | [one sentence why]
  `.trim(), CLAUDE_FAST, 1000);
};

const routeNaturalLanguage = async (apiKey, userInput, context) => {
  return callClaude(apiKey, `
DevPilot AI agent. User said: "${userInput}"
Context: ${context}
Available commands: new, launch, push, wire, audit, fix, chat, check, vault, settings
Reply with the exact command to run OR a direct answer. Be brief, max 2 sentences.
  `.trim(), CLAUDE_FAST, 256);
};

module.exports = {
  callClaude, auditProject, fixCode, chatAboutProject,
  suggestUpgrades, routeNaturalLanguage,
  CLAUDE_FAST, CLAUDE_QUALITY
};
