/* ============================================================
   VerdeVivo - Routine: weekly calendar, daily tasks, streak
   ============================================================ */

window.Routine = (() => {

  const TASK_ICONS = {
    'Rega': 'droplet', 'Adubar': 'flask-conical', 'Podar': 'scissors',
    'Girar vaso': 'refresh-cw', 'Verificar luz': 'sun', 'Pulverizar': 'cloud-rain',
    'Limpar folhas': 'sparkles',
  };
  const TASK_COLORS = {
    'Rega': 'blue', 'Adubar': 'green', 'Podar': 'coral', 'Girar vaso': 'warn',
    'Verificar luz': 'warn', 'Pulverizar': 'blue', 'Limpar folhas': 'green',
  };

  function todayKey() { return App.formatDate(new Date()); }

  function getTasksForToday() {
    const key = todayKey();
    return App.getTasks().filter(t => t.due === key);
  }

  function getTasksOrDefault() {
    const key = todayKey();
    const tasks = App.getTasks();
    const todays = tasks.filter(t => t.due === key);
    if (todays.length === 0) {
      const base = [
        { id: 't1', type: 'Rega', plant: 'Ficus Lyrata', plantId: 'p1', time: '08:30', desc: 'Usar 150ml de água mineral em temperatura ambiente.' },
        { id: 't2', type: 'Pulverizar', plant: 'Calathea Orbifolia', plantId: 'p3', time: '09:00', desc: 'Pulverizar as folhas para aumentar a umidade.' },
        { id: 't3', type: 'Girar vaso', plant: 'Samambaia', plantId: 'p7', time: '10:15', desc: 'Girar o vaso 180° para um crescimento uniforme.' },
        { id: 't4', type: 'Verificar luz', plant: 'Costela-de-Adão', plantId: 'p2', time: '14:00', desc: 'Observar a posição de luz e reajustar se necessário.' },
        { id: 't5', type: 'Limpar folhas', plant: 'Zamioculca', plantId: 'p8', time: '16:30', desc: 'Remover o pó das folhas com pano úmido.' },
        { id: 't6', type: 'Adubar', plant: 'Jiboia', plantId: 'p5', time: '18:00', desc: 'Aplicar adubo líquido diluído na rega.' },
      ].map(t => ({ ...t, due: key, done: false }));
      App.saveTasks([...tasks, ...base]);
      return base;
    }
    return todays;
  }

  function saveTask(id, patch) {
    const tasks = App.getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], ...patch };
    App.saveTasks(tasks);
    syncRoutine(tasks);
  }

  function syncRoutine(tasks) {
    const key = todayKey();
    const todays = tasks.filter(t => t.due === key);
    const doneCount = todays.filter(t => t.done).length;
    const routine = App.getRoutine();
    routine[key] = { doneCount, total: todays.length };
    if (todays.length && doneCount === todays.length && routine.__notifiedToday !== key) {
      App.addNotification('Você completou sua rotina de hoje! 🎉', 'check', 'green');
      routine.__notifiedToday = key;
    }
    App.saveRoutine(routine);
  }

  function addTask(data) {
    const tasks = App.getTasks();
    tasks.push({ id: 't' + Date.now(), ...data, due: todayKey(), done: false });
    App.saveTasks(tasks);
  }

  function streak() {
    const routine = App.getRoutine();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 700; i++) {
      const rec = routine[App.formatDate(d)];
      if (rec && rec.doneCount > 0) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    if (streak === 0) {
      const d2 = new Date();
      d2.setDate(d2.getDate() - 1);
      for (let i = 0; i < 700; i++) {
        const rec = routine[App.formatDate(d2)];
        if (rec && rec.doneCount > 0) { streak++; d2.setDate(d2.getDate() - 1); }
        else break;
      }
    }
    return streak;
  }

  function calendarHtml(today = new Date()) {
    const routine = App.getRoutine();
    const dow = (today.getDay() + 6) % 7; // Monday first
    const monday = new Date(today);
    monday.setDate(today.getDate() - dow);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = App.formatDate(d);
      const rec = routine[key];
      const isToday = key === todayKey();
      let cls = 'future';
      if (isToday) cls = 'today';
      else if (rec && rec.total && rec.doneCount >= rec.total) cls = 'completed';
      else if (rec && rec.doneCount > 0) cls = 'partial';
      days.push({ key, num: d.getDate(), name: ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'][i], cls, rec });
    }
    return days.map(d => `
      <div class="cal-day ${d.cls}">
        <div class="cd-name">${d.name}</div>
        <div class="cd-num">${d.num}</div>
        <div class="cd-dot"></div>
      </div>`).join('');
  }

  function taskCard(t) {
    const icon = TASK_ICONS[t.type] || 'leaf';
    const color = TASK_COLORS[t.type] || 'green';
    return `
      <div class="task-card ${t.done ? 'done' : ''}" data-task="${t.id}">
        <button class="check-btn" data-toggle-task="${t.id}" aria-label="Concluir"><svg data-lucide="check" width="18" height="18"></svg></button>
        <span class="tc-time">${t.time}</span>
        <span class="tc-icon m-icon-${color}"><svg data-lucide="${icon}" width="22" height="22"></svg></span>
        <div class="tc-body">
          <div class="tc-title">${t.type}</div>
          <div class="tc-plant">${t.plant}</div>
          <div class="tc-desc">${t.desc}</div>
          <div class="tc-meta">
            ${t.done ? '<span class="badge badge-green">Concluída</span>' : '<span class="badge badge-coral">Pendente</span>'}
            <button class="btn btn-ghost btn-sm" data-remove-task="${t.id}">Remover</button>
          </div>
        </div>
      </div>`;
  }

  return {
    TASK_ICONS, TASK_COLORS,
    todayKey, getTasksToday: getTasksForToday, getTasksOrDefault,
    saveTask, addTask, syncRoutine, streak, calendarHtml, taskCard,
  };
})();