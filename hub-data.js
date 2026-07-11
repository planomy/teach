const HubStore = (() => {
  const KEYS = {
    events: 'teach-events',
    meetings: 'teach-meetings',
    reminders: 'teach-reminders',
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
    }
  };
})();
