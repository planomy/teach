const HubStore = (() => {
  const KEYS = {
    events: 'teach-events',
    meetings: 'teach-meetings',
    reminders: 'teach-reminders',
    homework: 'teach-homework',
    timetable: 'teach-timetable'
  };

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function load(key) {
    try {
      const raw = localStorage.getItem(KEYS[key]);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(key, list) {
    localStorage.setItem(KEYS[key], JSON.stringify(list));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function formatShortDate(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${+day} ${months[+m - 1]}`;
  }

  function sortByDate(list) {
    return list.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.title.localeCompare(b.title));
  }

  return {
    KEYS,
    uid,
    load,
    save,
    today,
    esc,
    formatShortDate,
    sortByDate,

    getEvents() { return sortByDate(load('events')); },
    addEvent({ date, title, note = '' }) {
      const titleTrim = (title || '').trim();
      if (!titleTrim) return null;
      const list = load('events');
      const item = { id: uid(), date: date || today(), title: titleTrim, note: (note || '').trim() };
      list.push(item);
      save('events', list);
      return item;
    },
    updateEvent(id, patch) {
      const list = load('events');
      const i = list.findIndex(x => x.id === id);
      if (i < 0) return null;
      list[i] = { ...list[i], ...patch };
      save('events', list);
      return list[i];
    },
    removeEvent(id) {
      const list = load('events').filter(x => x.id !== id);
      save('events', list);
    },

    getMeetings() { return sortByDate(load('meetings')); },
    addMeeting({ date, title, note = '' }) {
      const titleTrim = (title || '').trim();
      if (!titleTrim) return null;
      const list = load('meetings');
      const item = { id: uid(), date: date || today(), title: titleTrim, note: (note || '').trim() };
      list.push(item);
      save('meetings', list);
      return item;
    },
    updateMeeting(id, patch) {
      const list = load('meetings');
      const i = list.findIndex(x => x.id === id);
      if (i < 0) return null;
      list[i] = { ...list[i], ...patch };
      save('meetings', list);
      return list[i];
    },
    removeMeeting(id) {
      const list = load('meetings').filter(x => x.id !== id);
      save('meetings', list);
    },

    getReminders() { return load('reminders'); },
    getOpenReminders() { return load('reminders').filter(r => !r.done); },
    addReminder(text) {
      const t = (text || '').trim();
      if (!t) return null;
      const list = load('reminders');
      const item = { id: uid(), text: t, done: false, created: today() };
      list.unshift(item);
      save('reminders', list);
      return item;
    },
    toggleReminder(id) {
      const list = load('reminders');
      const item = list.find(x => x.id === id);
      if (!item) return null;
      item.done = !item.done;
      save('reminders', list);
      return item;
    },
    removeReminder(id) {
      const list = load('reminders').filter(x => x.id !== id);
      save('reminders', list);
    },

    getHomework() { return load('homework'); },
    getOpenHomework() { return load('homework').filter(r => !r.done); },
    addHomework(text) {
      const t = (text || '').trim();
      if (!t) return null;
      const list = load('homework');
      const item = { id: uid(), text: t, done: false, created: today() };
      list.unshift(item);
      save('homework', list);
      return item;
    },
    toggleHomework(id) {
      const list = load('homework');
      const item = list.find(x => x.id === id);
      if (!item) return null;
      item.done = !item.done;
      save('homework', list);
      return item;
    },
    removeHomework(id) {
      const list = load('homework').filter(x => x.id !== id);
      save('homework', list);
    },

    getTimetable(fallback) {
      try {
        const raw = localStorage.getItem(KEYS.timetable);
        if (!raw) return JSON.parse(JSON.stringify(fallback));
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return JSON.parse(JSON.stringify(fallback));
        return data;
      } catch (e) {
        return JSON.parse(JSON.stringify(fallback));
      }
    },
    setTimetable(data) {
      localStorage.setItem(KEYS.timetable, JSON.stringify(data));
    },
    resetTimetable() {
      localStorage.removeItem(KEYS.timetable);
    },

    /** Composite 0–1 from effort / participation / tasks. null if nothing rated or absent. */
    studentHeat(st) {
      if (!st || st.absent) return null;
      const parts = [];
      const effort = +st.effort || 0;
      const part = +st.part || 0;
      const task = +st.task || 0;
      if (effort > 0) parts.push(effort / 5);
      if (part > 0) parts.push(part / 6);
      if (task === 1) parts.push(1);
      else if (task === 2) parts.push(0.55);
      else if (task === 3) parts.push(0.12);
      if (!parts.length) return null;
      const score = parts.reduce((a, b) => a + b, 0) / parts.length;
      return {
        score,
        pct: Math.round(score * 100),
        label: score >= 0.8 ? 'Great' : score >= 0.55 ? 'Good' : score >= 0.35 ? 'Okay' : score >= 0.2 ? 'Low' : 'Struggling',
        color: heatColor(score)
      };
    },

    getNotesSession() {
      try {
        const raw = localStorage.getItem('teach-notes-session');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    getNotesArchive() {
      try {
        const raw = localStorage.getItem('teach-notes-archive');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    getHeatCarry() {
      try {
        const raw = localStorage.getItem('teach-notes-heat');
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    },

    setHeatCarry(map) {
      if (!map || !Object.keys(map).length) {
        localStorage.removeItem('teach-notes-heat');
        return;
      }
      localStorage.setItem('teach-notes-heat', JSON.stringify(map));
    },

    clearHeatCarry() {
      localStorage.removeItem('teach-notes-heat');
    },

    getHeatCarryFor(name) {
      const key = (name || '').trim().toLowerCase();
      if (!key) return null;
      const row = this.getHeatCarry()[key];
      if (!row || row.score == null) return null;
      return {
        score: row.score,
        pct: row.pct != null ? row.pct : Math.round(row.score * 100),
        label: row.label || (row.score >= 0.8 ? 'Great' : row.score >= 0.55 ? 'Good' : row.score >= 0.35 ? 'Okay' : row.score >= 0.2 ? 'Low' : 'Struggling'),
        color: row.color || heatColor(row.score),
        carried: true
      };
    },

    /** Latest heat for a name from current session, then archive (newest first). */
    latestHeatForName(name, session) {
      const key = (name || '').trim().toLowerCase();
      if (!key) return null;
      const s = session || this.getNotesSession();
      if (s?.students) {
        const cur = s.students.find(st => (st.name || '').trim().toLowerCase() === key);
        const h = this.studentHeat(cur);
        if (h) return h;
      }
      for (const sess of this.getNotesArchive()) {
        const st = (sess.students || []).find(x => (x.name || '').trim().toLowerCase() === key);
        const h = this.studentHeat(st);
        if (h) return h;
      }
      return this.getHeatCarryFor(name);
    },

    buildHeatCarry(session) {
      const s = session || this.getNotesSession();
      const map = {};
      const names = new Set();
      (s?.students || []).forEach(st => {
        const n = (st.name || '').trim();
        if (n) names.add(n);
      });
      this.getNotesArchive().forEach(sess => {
        (sess.students || []).forEach(st => {
          const n = (st.name || '').trim();
          if (n) names.add(n);
        });
      });
      names.forEach(name => {
        const h = this.latestHeatForName(name, s);
        if (!h) return;
        map[name.toLowerCase()] = {
          name,
          score: h.score,
          pct: h.pct,
          label: h.label,
          color: h.color
        };
      });
      return map;
    },

    classHeatSnapshot(session) {
      const s = session || this.getNotesSession();
      if (!s || !Array.isArray(s.students)) {
        return { students: [], avg: null, rated: 0, named: 0, subject: '', date: '' };
      }

      // Chronological heat history per student (oldest → newest)
      const history = new Map();
      const archive = this.getNotesArchive().slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      archive.forEach(sess => {
        (sess.students || []).forEach(st => {
          const name = (st.name || '').trim();
          if (!name || st.absent) return;
          const heat = this.studentHeat(st);
          if (!heat) return;
          const key = name.toLowerCase();
          if (!history.has(key)) history.set(key, []);
          history.get(key).push(heat.score);
        });
      });
      // Current session last
      (s.students || []).forEach(st => {
        const name = (st.name || '').trim();
        if (!name || st.absent) return;
        const heat = this.studentHeat(st);
        if (!heat) return;
        const key = name.toLowerCase();
        if (!history.has(key)) history.set(key, []);
        history.get(key).push(heat.score);
      });

      const named = s.students
        .filter(st => (st.name || '').trim() && !st.absent)
        .map(st => {
          const name = (st.name || '').trim();
          const parts = name.split(/\s+/).filter(Boolean);
          const first = parts[0] || '';
          const last = parts.length > 1 ? parts[parts.length - 1] : '';
          const live = this.studentHeat(st);
          const heat = live || this.getHeatCarryFor(name);
          // Seed trajectory with carried heat when archive was cleared for a new term
          if (heat?.carried) {
            const key = name.toLowerCase();
            if (!history.has(key) || !history.get(key).length) {
              history.set(key, [heat.score]);
            }
          }
          return {
            id: st.id,
            name,
            first,
            last,
            base: first.slice(0, 2),
            heat
          };
        });

      // First 2 letters of first name; if clash, append first letter of last name
      const baseCounts = {};
      named.forEach(st => {
        const key = st.base.toLowerCase();
        baseCounts[key] = (baseCounts[key] || 0) + 1;
      });

      const students = named.map((st, index) => {
        const clash = baseCounts[st.base.toLowerCase()] > 1;
        let initial = st.base;
        if (clash && st.last) initial = st.base + st.last.slice(0, 1);
        initial = initial.slice(0, 3);
        const scores = history.get(st.name.toLowerCase()) || [];
        const traj = trajectoryFromScores(scores, st.heat ? st.heat.score : null);
        return {
          id: st.id,
          name: st.name,
          initial: initial.toUpperCase(),
          heat: st.heat,
          traj,
          index
        };
      });
      const rated = students.filter(x => x.heat);
      const avg = rated.length
        ? rated.reduce((a, x) => a + x.heat.score, 0) / rated.length
        : null;
      return {
        students,
        avg,
        rated: rated.length,
        named: students.length,
        subject: s.subject || '',
        date: s.date || '',
        color: avg == null ? null : heatColor(avg)
      };
    }
  };

  function avgNums(arr) {
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /** Rising → high on sky; falling → low. Uses recent vs earlier lesson heats. */
  function trajectoryFromScores(scores, currentScore) {
    if (scores.length >= 2) {
      const recentN = Math.min(3, Math.floor(scores.length / 2) || 1);
      const recent = scores.slice(-recentN);
      const earlier = scores.slice(0, -recentN);
      const recentAvg = avgNums(recent);
      const earlierAvg = avgNums(earlier.length ? earlier : scores.slice(0, -1));
      const delta = recentAvg - earlierAvg;
      // Map delta (~-0.5..0.5) onto vertical 0.1..0.9 (CSS top%; invert so high traj = low top%)
      const yNorm = Math.max(0, Math.min(1, 0.5 + delta * 1.35));
      const label = delta >= 0.07 ? 'rising' : delta <= -0.07 ? 'falling' : 'steady';
      const arrow = label === 'rising' ? '↑' : label === 'falling' ? '↓' : '→';
      return {
        delta,
        label,
        arrow,
        lessons: scores.length,
        // CSS top%: rising kids near top of sky
        yPct: 12 + (1 - yNorm) * 72
      };
    }
    // First rated lesson: park by current heat so the sky isn't flat
    if (currentScore != null) {
      return {
        delta: 0,
        label: 'new',
        arrow: '·',
        lessons: 1,
        yPct: 12 + (1 - currentScore) * 72
      };
    }
    // Unrated: sit low, staggered so they don't stack on one line
    return { delta: 0, label: 'unrated', arrow: '', lessons: 0, yPct: null };
  }

  function heatColor(score) {
    // red (struggling) → orange → yellow → green → blue (thriving)
    const stops = [
      { t: 0,    c: [180, 55, 45] },
      { t: 0.25, c: [210, 110, 40] },
      { t: 0.45, c: [200, 160, 40] },
      { t: 0.65, c: [50, 150, 95] },
      { t: 0.85, c: [35, 130, 170] },
      { t: 1,    c: [40, 100, 190] }
    ];
    const t = Math.max(0, Math.min(1, score));
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].t && t <= stops[i + 1].t) {
        a = stops[i];
        b = stops[i + 1];
        break;
      }
    }
    const u = (t - a.t) / (b.t - a.t || 1);
    const rgb = a.c.map((v, i) => Math.round(v + (b.c[i] - v) * u));
    return '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('');
  }
})();
