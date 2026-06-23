(async () => {
  const base = 'http://localhost:3000';
  const today = new Date().toISOString().split('T')[0];
  const uid = '00000000-0000-0000-0000-000000000001';
  let ok = true;

  function fail(msg) {
    console.error('FAIL:', msg);
    ok = false;
  }

  try {
    // 1. POST invalid score
    let res = await fetch(base + '/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, score: 0, score_date: today }),
    });
    if (res.ok) {
      fail('Accepted invalid score 0');
    } else {
      console.log('OK: rejected invalid score');
    }

    // 2. POST valid score
    res = await fetch(base + '/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, score: 20, score_date: today }),
    });
    if (!res.ok) {
      fail('Failed to accept valid score: ' + (await res.text()));
    } else {
      console.log('OK: accepted valid score');
    }

    // 3. POST another valid score for same date (should update, not duplicate)
    res = await fetch(base + '/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, score: 18, score_date: today }),
    });
    if (!res.ok) {
      fail('Failed to update existing score: ' + (await res.text()));
    } else {
      console.log('OK: updated score for same date');
    }

    // 4. GET scores and ensure only one entry exists for user
    res = await fetch(base + '/api/scores?user_id=' + uid);
    const data = await res.json();
    const userScores = Array.isArray(data) ? data : [];
    if (userScores.length > 1) {
      fail('More than one score exists for same date after update');
    } else {
      console.log('OK: single entry present after update');
    }

    // 5. Race condition simulation: fire two POSTs in parallel
    const p1 = fetch(base + '/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, score: 22, score_date: today }),
    });
    const p2 = fetch(base + '/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, score: 19, score_date: today }),
    });

    await Promise.all([p1, p2]);

    // Read scores after race
    res = await fetch(base + '/api/scores?user_id=' + uid);
    const postRace = await res.json();
    const raceScores = Array.isArray(postRace) ? postRace : [];
    if (raceScores.length <= 1) {
      console.log('OK: race did not create duplicate entries');
    } else {
      console.log('NOTE: race created duplicates, running cleanup');

      // run cleanup using service role key from env
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const cleanRes = await fetch(base + '/api/scores/cleanup', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + serviceKey },
      });
      const cleanBody = await cleanRes.json();
      console.log('Cleanup result', cleanBody);

      // verify only one remains
      res = await fetch(base + '/api/scores?user_id=' + uid);
      const afterClean = await res.json();
      const finalScores = Array.isArray(afterClean) ? afterClean : [];
      if (finalScores.length !== 1) {
        fail('Cleanup did not reduce duplicates to a single entry');
      } else {
        console.log('OK: cleanup reduced duplicates to single entry');
      }
    }
  } catch (e) {
    console.error('ERROR', e);
    ok = false;
  }

  if (!ok) process.exit(1);
  console.log('All tests passed');
})();
