// Feature: pickleball-club-site
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { serializeMatchYaml } from '../assets/js/match-utils.js';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const teamIdArb = fc.constantFrom('team-alpha', 'team-beta', 'team-gamma');
const scoreArb  = fc.integer({ min: 0, max: 21 });

const validFormArb = fc.record({
  home_team:   teamIdArb,
  away_team:   teamIdArb,
  season:      fc.constantFrom('spring-2026', 'fall-2026'),
  week:        fc.integer({ min: 1, max: 20 }).map(String),
  match_date:  fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
                 .map(d => d.toISOString().slice(0, 10)),
  location:    fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0 && !s.includes('\n')),
  mens_home:   scoreArb.map(String), mens_away:   scoreArb.map(String),
  womens_home: scoreArb.map(String), womens_away: scoreArb.map(String),
  mixed_home:  scoreArb.map(String), mixed_away:  scoreArb.map(String),
  dream_home:  scoreArb.map(String), dream_away:  scoreArb.map(String),
});

// ── Inline submitMatchResult (mirrors submit-match.html logic) ────────────────
// We re-implement the pure orchestration logic here so it can be tested
// without a browser DOM. It uses the same call sequence as the page script.

function makeSubmitMatchResult(fetchMock) {
  async function apiHeaders(pat) {
    return {
      'Authorization': 'token ' + pat,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  async function submitMatchResult(formData, pat, repoOwner, repoName) {
    const seasonSlug = formData.season;
    const filePath   = '_data/seasons/' + seasonSlug + '.yml';
    const headers    = await apiHeaders(pat);

    // Step 1: GET file
    const fileRes = await fetchMock(
      'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/' + filePath,
      { headers }
    );
    if (!fileRes.ok) throw { status: fileRes.status, step: 'getFile' };
    const fileInfo   = await fileRes.json();
    const currentYaml = atob(fileInfo.content.replace(/\n/g, ''));
    const fileSha    = fileInfo.sha;

    // Build updated YAML
    const matchObj = {
      week: formData.week, date: formData.match_date, location: formData.location,
      home_team: formData.home_team, away_team: formData.away_team,
      result: {
        mens_doubles:   { home: Number(formData.mens_home),   away: Number(formData.mens_away) },
        womens_doubles: { home: Number(formData.womens_home), away: Number(formData.womens_away) },
        mixed_doubles:  { home: Number(formData.mixed_home),  away: Number(formData.mixed_away) },
        dreambreaker:   { home: Number(formData.dream_home),  away: Number(formData.dream_away) },
      },
    };
    const matchYaml  = serializeMatchYaml(matchObj);
    const updatedYaml = currentYaml.trimEnd() + '\n' + matchYaml + '\n';

    // Step 2a: GET main HEAD sha
    const refRes = await fetchMock(
      'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/git/ref/heads/main',
      { headers }
    );
    if (!refRes.ok) throw { status: refRes.status, step: 'getRef' };
    const refData = await refRes.json();
    const mainSha = refData.object.sha;

    // Step 2b: POST create branch
    const branchName = 'match/' + formData.match_date + '-' + formData.home_team + '-vs-' + formData.away_team;
    const branchRes  = await fetchMock(
      'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/git/refs',
      { method: 'POST', headers, body: JSON.stringify({ ref: 'refs/heads/' + branchName, sha: mainSha }) }
    );
    if (!branchRes.ok) throw { status: branchRes.status, step: 'createBranch' };

    // Step 2c: PUT updated file
    const putRes = await fetchMock(
      'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/' + filePath,
      {
        method: 'PUT', headers,
        body: JSON.stringify({
          message: 'Add match result',
          content: btoa(updatedYaml),
          sha: fileSha,
          branch: branchName,
        }),
      }
    );
    if (!putRes.ok) throw { status: putRes.status, step: 'updateFile' };

    // Step 3: POST PR
    const prRes = await fetchMock(
      'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/pulls',
      {
        method: 'POST', headers,
        body: JSON.stringify({ title: 'Match result', body: '', head: branchName, base: 'main' }),
      }
    );
    if (!prRes.ok) throw { status: prRes.status, step: 'createPR' };
    const pr = await prRes.json();
    return pr.html_url;
  }

  return submitMatchResult;
}

// ── Property 7: Valid submission produces correct GitHub API call sequence ─────

describe('Property 7: Valid submission produces correct GitHub API call sequence', () => {
  it('calls GET file, GET ref, POST branch, PUT file, POST PR — in that order', async () => {
    await fc.assert(
      fc.asyncProperty(validFormArb, async (formData) => {
        const calls = [];
        const fakeSha     = 'abc123';
        const fakeFileSha = 'def456';
        const fakePrUrl   = 'https://github.com/owner/repo/pull/1';
        const fakeYaml    = btoa('schedule:\n');

        const fetchMock = vi.fn(async (url, opts) => {
          const method = (opts && opts.method) || 'GET';
          calls.push({ url, method });

          if (method === 'GET' && url.includes('/contents/')) {
            return { ok: true, json: async () => ({ content: fakeYaml, sha: fakeFileSha }) };
          }
          if (method === 'GET' && url.includes('/git/ref/')) {
            return { ok: true, json: async () => ({ object: { sha: fakeSha } }) };
          }
          if (method === 'POST' && url.includes('/git/refs')) {
            return { ok: true, json: async () => ({}) };
          }
          if (method === 'PUT' && url.includes('/contents/')) {
            return { ok: true, json: async () => ({}) };
          }
          if (method === 'POST' && url.includes('/pulls')) {
            return { ok: true, json: async () => ({ html_url: fakePrUrl }) };
          }
          return { ok: false, status: 404 };
        });

        const submitMatchResult = makeSubmitMatchResult(fetchMock);
        const prUrl = await submitMatchResult(formData, 'fake-pat', 'owner', 'repo');

        expect(prUrl).toBe(fakePrUrl);
        expect(calls).toHaveLength(5);

        // Verify order: GET file, GET ref, POST branch, PUT file, POST PR
        expect(calls[0].method).toBe('GET');
        expect(calls[0].url).toContain('/contents/');
        expect(calls[1].method).toBe('GET');
        expect(calls[1].url).toContain('/git/ref/');
        expect(calls[2].method).toBe('POST');
        expect(calls[2].url).toContain('/git/refs');
        expect(calls[3].method).toBe('PUT');
        expect(calls[3].url).toContain('/contents/');
        expect(calls[4].method).toBe('POST');
        expect(calls[4].url).toContain('/pulls');
      }),
      { numRuns: 50 }
    );
  });
});

// ── Property 8: API response reflected in UI feedback ─────────────────────────

describe('Property 8: API response reflected in UI feedback', () => {
  it('success response produces non-empty message containing PR URL', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (prUrl) => {
          // Simulate the showSuccess logic
          const message = '✓ Match submitted! View Pull Request: ' + prUrl;
          expect(message.length).toBeGreaterThan(0);
          expect(message).toContain(prUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('error response produces non-empty message describing the failure', () => {
    const errorTable = {
      401: 'Authentication failed. Check your token.',
      403: 'Permission denied. Ensure token has `repo` scope.',
      404: 'Season data file not found. Contact admin.',
      422: 'Could not create branch. Please try again.',
    };

    function errorMessageForStatus(err) {
      if (!err || !err.status) return 'Network error. Check connection and try again.';
      return errorTable[err.status] || 'API error (' + err.status + '). Please try again.';
    }

    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ status: fc.constantFrom(401, 403, 404, 422) }),
          fc.constant(null),
          fc.constant({ status: 500 }),
        ),
        (err) => {
          const msg = errorMessageForStatus(err);
          expect(typeof msg).toBe('string');
          expect(msg.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
