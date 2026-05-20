(function () {
  const LONG_PRESS_MS = 800;
  const STORAGE_KEY = "toy52059-demo-save-v1";
  const INACTIVITY_MS = 15 * 60 * 1000;
  const TIMER_CYCLE = [5, 10, 15, 0];
  const SEGMENT_MAP = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "d", "e", "g"],
    "3": ["a", "b", "c", "d", "g"],
    "4": ["b", "c", "f", "g"],
    "5": ["a", "c", "d", "f", "g"],
    "6": ["a", "c", "d", "e", "f", "g"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"],
    "-": ["g"],
    "_": ["d"],
  };

  const MUSIC_SONGS = [
    { key: "song1", button: "star", label: "小星星", pages: ["1155665", "4433221", "5544332", "5544332", "1155665", "4433221"] },
    { key: "song2", button: "single", label: "两只老虎", pages: ["1231123", "1345345", "565431", "565431", "251251"] },
    { key: "song3", button: "double", label: "生日快乐", pages: ["556517", "556521", "5553176", "443121"] },
    { key: "song4", button: "timesDivide", label: "粉刷匠", pages: ["5353531", "24325", "5353531", "24321"] },
    { key: "song5", button: "table99", label: "欢乐颂", pages: ["3345543", "2112332", "3345543", "2112321", "2231234"] },
  ];

  const TABLE_99_SEQUENCE = Array.from({ length: 81 }, (_, index) => {
    const a = Math.floor(index / 9) + 1;
    const b = (index % 9) + 1;
    return { a, b, result: a * b };
  });

  const els = {};
  const runtime = {
    currentAudio: null,
    currentAudioName: "",
    currentAudioCategory: "noncontent",
    currentAudioSourceKind: "",
    currentAudioPriority: 0,
    pendingAudioTimeout: null,
    sequenceAudioTimeout: null,
    sequenceToken: 0,
    activeSequence: null,
    countdownInterval: null,
    inactivityTimeout: null,
    delayedAdvanceTimeout: null,
    table99Interval: null,
    importedAudio: new Map(),
    buttonPressStates: new WeakMap(),
  };

  const state = createDefaultState();

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    buildSegments();
    bindVolumeSwitch();
    bindToyButtons();
    bindUtilityButtons();
    bindKeyboard();
    bindAudioControls();
    renderAudioTable();
    render();
    runQueryPreset();
  }

  function createDefaultState() {
    return {
      volume: "off",
      powered: false,
      sleeping: false,
      faceEnabled: true,
      faceMood: "idle",
      modeGroup: "idle",
      currentMathMode: "singleAddSub",
      lastMathMode: "singleAddSub",
      gameSubmode: "memory",
      lastNormalMode: { modeGroup: "math", currentMathMode: "singleAddSub" },
      timerSetting: 0,
      timerRemaining: 0,
      timerExpired: false,
      progress: 0,
      correctCount: 0,
      input: "",
      compareSelection: "",
      question: null,
      awaitingAdvance: null,
      displayPrompt: "",
      eventLog: [],
      musicSongKey: "song1",
      musicPageIndex: 0,
      musicSolvedCount: 0,
      table99Index: 0,
      guessAttemptsLeft: 10,
      lastGuessFeedback: null,
      audioSearch: "",
      roundQuestionKeys: [],
    };
  }

  function cacheElements() {
    [
      "volumeSwitch",
      "toyShell",
      "lcdScreen",
      "sleepMask",
      "faceRow",
      "timerSlot",
      "timerValue",
      "musicSlot",
      "gameSlot",
      "progressSlot",
      "progressValue",
      "modeTitle",
      "modeSubtitle",
      "ruleHint",
      "audioHint",
      "eventLog",
      "sleepButton",
      "coldBootButton",
      "audioImport",
      "audioImportSummary",
      "audioSearch",
      "audioTable",
      "audioStats",
      "clearImportedAudio",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });

    els.digitCells = Array.from(document.querySelectorAll(".digit-cell"));
    els.operatorCells = Array.from(document.querySelectorAll(".operator-cell"));
    els.volumeButtons = Array.from(els.volumeSwitch.querySelectorAll("button"));
    els.toyButtons = Array.from(document.querySelectorAll("[data-button]"));
  }

  function buildSegments() {
    els.digitCells.forEach((cell) => {
      ["a", "b", "c", "d", "e", "f", "g"].forEach((segment) => {
        const span = document.createElement("span");
        span.className = `seg seg-${segment}`;
        span.dataset.segment = segment;
        cell.appendChild(span);
      });
    });
  }

  function bindVolumeSwitch() {
    els.volumeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setVolume(button.dataset.volume);
      });
    });
  }

  function bindToyButtons() {
    els.toyButtons.forEach((button) => {
      const pressState = { timer: null, longTriggered: false };
      runtime.buttonPressStates.set(button, pressState);

      const start = (event) => {
        event.preventDefault();
        pressState.longTriggered = false;
        button.classList.add("is-pressed");
        pressState.timer = window.setTimeout(() => {
          pressState.longTriggered = true;
          handleToyButton(button.dataset.button, true);
        }, LONG_PRESS_MS);
      };

      const end = () => {
        button.classList.remove("is-pressed");
        if (pressState.timer) {
          window.clearTimeout(pressState.timer);
          pressState.timer = null;
        }
        if (!pressState.longTriggered) {
          handleToyButton(button.dataset.button, false);
        }
      };

      const cancel = () => {
        button.classList.remove("is-pressed");
        if (pressState.timer) {
          window.clearTimeout(pressState.timer);
          pressState.timer = null;
        }
      };

      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", end);
      button.addEventListener("pointerleave", cancel);
      button.addEventListener("pointercancel", cancel);
    });
  }

  function bindUtilityButtons() {
    els.sleepButton.addEventListener("click", () => {
      if (!state.powered || state.sleeping) {
        return;
      }
      enterSleep(true);
    });

    els.coldBootButton.addEventListener("click", () => {
      coldBoot(true);
    });
  }

  function bindKeyboard() {
    const keyMap = {
      Enter: "ok",
      Backspace: "backspace",
      "[": "less",
      "]": "greater",
      "=": "equal",
      g: "star",
      q: "single",
      w: "double",
      e: "timesDivide",
      r: "table99",
      t: "timer",
    };

    document.addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const mapped = /^\d$/.test(event.key) ? `digit-${event.key}` : keyMap[event.key];
      if (!mapped) {
        return;
      }
      const targetTag = event.target.tagName;
      if (targetTag === "INPUT" || targetTag === "TEXTAREA") {
        return;
      }
      event.preventDefault();
      handleToyButton(mapped, false);
    });
  }

  function bindAudioControls() {
    els.audioImport.addEventListener("change", (event) => {
      importAudioFiles(Array.from(event.target.files || []));
    });

    els.audioSearch.addEventListener("input", (event) => {
      state.audioSearch = event.target.value.trim().toLowerCase();
      renderAudioTable();
    });

    els.clearImportedAudio.addEventListener("click", () => {
      clearImportedAudio();
    });
  }

  function setVolume(nextVolume) {
    if (nextVolume === state.volume) {
      return;
    }

    if (nextVolume === "off") {
      if (state.powered) {
        powerOff();
      }
      state.volume = "off";
      render();
      return;
    }

    const wasOff = !state.powered;
    state.volume = nextVolume;
    if (wasOff) {
      powerOn();
    } else {
      applyCurrentAudioVolume();
      logEvent(`音量切到 ${volumeLabel(nextVolume)}`);
    }
    render();
  }

  function powerOn() {
    const requestedVolume = state.volume;
    state.powered = true;
    state.sleeping = false;
    cancelSleepMask();
    clearAudioTimeout();
    const saved = readSavedSession();
    if (saved) {
      hydrateState(saved);
      state.volume = requestedVolume;
      state.powered = true;
      logEvent("恢复上次保存的会话");
    } else {
      coldBoot(false);
      state.volume = requestedVolume;
      state.powered = true;
    }
    playAudio("SFX_boot.wav", { category: "noncontent" });
    scheduleQuestionSpeech(560);
    startCountdownForQuestion();
    startInactivityTimer();
    render();
  }

  function powerOff() {
    persistSession();
    stopAllRuntimeTimers();
    stopCurrentAudio();
    state.powered = false;
    state.sleeping = false;
    state.modeGroup = "idle";
    state.faceMood = "idle";
    state.question = null;
    state.input = "";
    state.awaitingAdvance = null;
    logEvent("已关机并保存会话");
    render();
  }

  function coldBoot(logIt) {
    stopAllRuntimeTimers();
    state.powered = state.volume !== "off";
    state.sleeping = false;
    state.faceEnabled = true;
    state.faceMood = "idle";
    state.modeGroup = "math";
    state.currentMathMode = "singleAddSub";
    state.lastMathMode = "singleAddSub";
    state.lastNormalMode = { modeGroup: "math", currentMathMode: "singleAddSub" };
    state.timerSetting = 0;
    state.timerRemaining = 0;
    state.timerExpired = false;
    state.progress = 0;
    state.correctCount = 0;
    state.input = "";
    state.compareSelection = "";
    state.awaitingAdvance = null;
    state.musicSongKey = "song1";
    state.musicPageIndex = 0;
    state.musicSolvedCount = 0;
    state.table99Index = 0;
    state.guessAttemptsLeft = 10;
    state.lastGuessFeedback = null;
    state.roundQuestionKeys = [];
    state.question = generateQuestionForCurrentMode();
    state.eventLog = [];
    removeSavedSession();
    startCountdownForQuestion();
    startInactivityTimer();
    if (logIt) {
      logEvent("冷启动完成，已清空缓存");
      scheduleQuestionSpeech(0);
    }
    render();
  }

  function enterSleep(manual) {
    if (!state.powered) {
      return;
    }
    persistSession();
    stopAllRuntimeTimers();
    if (!manual) {
      playAudio("SFX_sleep.wav", { category: "noncontent" });
    } else {
      playAudio("SFX_sleep.wav", { category: "noncontent" });
    }
    state.sleeping = true;
    state.awaitingAdvance = null;
    logEvent("进入休眠");
    render();
  }

  function wakeFromSleep() {
    const saved = readSavedSession();
    if (saved) {
      hydrateState(saved);
      logEvent("从休眠恢复");
    }
    state.sleeping = false;
    startCountdownForQuestion();
    startInactivityTimer();
    render();
  }

  function hydrateState(saved) {
    Object.assign(state, createDefaultState(), saved);
    state.powered = state.volume !== "off";
    state.sleeping = false;
    state.faceEnabled = true;
    state.faceMood = "idle";
    state.audioSearch = state.audioSearch || "";
    state.roundQuestionKeys = Array.isArray(state.roundQuestionKeys) ? state.roundQuestionKeys.slice() : [];
    if (["math", "compare"].includes(state.modeGroup) && state.question) {
      const currentSignature = questionSignature(state.question, state.modeGroup, state.currentMathMode);
      if (currentSignature && !state.roundQuestionKeys.includes(currentSignature)) {
        state.roundQuestionKeys.push(currentSignature);
      }
    }
    if (state.modeGroup === "idle") {
      state.modeGroup = "math";
      state.currentMathMode = "singleAddSub";
      state.roundQuestionKeys = [];
      state.question = generateQuestionForCurrentMode();
    }
  }

  function persistSession() {
    const payload = {
      volume: state.volume,
      modeGroup: state.modeGroup,
      currentMathMode: state.currentMathMode,
      lastMathMode: state.lastMathMode,
      gameSubmode: state.modeGroup === "game" ? "memory" : state.gameSubmode,
      lastNormalMode: state.lastNormalMode,
      timerSetting: state.timerSetting,
      timerRemaining: state.timerRemaining,
      timerExpired: state.timerExpired,
      progress: state.progress,
      correctCount: state.correctCount,
      input: state.input,
      compareSelection: state.compareSelection,
      question: sanitizeQuestionForSave(state.question),
      musicSongKey: "song1",
      musicPageIndex: 0,
      musicSolvedCount: 0,
      table99Index: 0,
      guessAttemptsLeft: state.guessAttemptsLeft,
      lastGuessFeedback: state.lastGuessFeedback,
      roundQuestionKeys: state.roundQuestionKeys,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function sanitizeQuestionForSave(question) {
    if (!question) {
      return null;
    }
    return JSON.parse(JSON.stringify(question));
  }

  function readSavedSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function removeSavedSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function stopAllRuntimeTimers() {
    clearInterval(runtime.countdownInterval);
    runtime.countdownInterval = null;
    clearTimeout(runtime.delayedAdvanceTimeout);
    runtime.delayedAdvanceTimeout = null;
    clearTimeout(runtime.inactivityTimeout);
    runtime.inactivityTimeout = null;
    clearInterval(runtime.table99Interval);
    runtime.table99Interval = null;
    clearAudioTimeout();
    clearSequenceAudioTimeout();
  }

  function startInactivityTimer() {
    clearTimeout(runtime.inactivityTimeout);
    if (!state.powered || state.sleeping) {
      return;
    }
    runtime.inactivityTimeout = window.setTimeout(() => {
      if (state.powered && !state.sleeping) {
        enterSleep(false);
      }
    }, INACTIVITY_MS);
  }

  function clearAudioTimeout() {
    if (runtime.pendingAudioTimeout) {
      window.clearTimeout(runtime.pendingAudioTimeout);
      runtime.pendingAudioTimeout = null;
    }
  }

  function clearSequenceAudioTimeout() {
    if (runtime.sequenceAudioTimeout) {
      window.clearTimeout(runtime.sequenceAudioTimeout);
      runtime.sequenceAudioTimeout = null;
    }
  }

  function startCountdownForQuestion() {
    clearInterval(runtime.countdownInterval);
    runtime.countdownInterval = null;
    state.timerExpired = false;
    if (!state.powered || state.sleeping) {
      return;
    }
    if (!["math", "compare"].includes(state.modeGroup) || state.timerSetting === 0) {
      state.timerRemaining = 0;
      return;
    }

    state.timerRemaining = state.timerSetting;
    runtime.countdownInterval = window.setInterval(() => {
      if (state.sleeping || !state.powered || !["math", "compare"].includes(state.modeGroup)) {
        clearInterval(runtime.countdownInterval);
        runtime.countdownInterval = null;
        return;
      }

      if (state.timerRemaining > 0) {
        state.timerRemaining -= 1;
        if (state.timerRemaining > 0 && state.timerRemaining <= 3) {
          playAudio("SFX_timeout_warn.wav", { category: "noncontent" });
        }
        if (state.timerRemaining === 0) {
          state.timerExpired = true;
          playAudio("SFX_timeout.wav", { category: "noncontent" });
        }
        render();
      }
    }, 1000);
  }

  function handleToyButton(buttonId, longPress) {
    if (!state.powered) {
      return;
    }

    startInactivityTimer();

    if (state.sleeping) {
      wakeFromSleep();
      return;
    }

    if (state.awaitingAdvance) {
      const kind = state.awaitingAdvance;
      state.awaitingAdvance = null;
      if (kind === "mathWrong") {
        state.faceMood = "idle";
        state.input = "";
        state.compareSelection = "";
        state.question = generateQuestionForCurrentMode();
        startCountdownForQuestion();
        scheduleQuestionSpeech(0);
      } else if (kind === "mathRoundEndWrong") {
        state.faceMood = "idle";
        finishMathRound();
      } else if (kind === "gameWrong") {
        state.faceMood = "idle";
        beginCurrentQuestion(true);
      } else if (kind === "gameRoundEndWrong") {
        state.faceMood = "idle";
        finishGameRound();
      } else if (kind === "guessLose") {
        state.faceMood = "idle";
        startGuessNumber();
      }
      render();
      return;
    }

    if (longPress) {
      handleLongPress(buttonId);
      return;
    }

    handleShortPress(buttonId);
  }

  function handleLongPress(buttonId) {
    if (state.modeGroup === "music" && ["star", "single", "double", "timesDivide", "table99"].includes(buttonId)) {
      handleMusicControls(buttonId);
      return;
    }

    if (buttonId === "timer") {
      toggleMusicMode();
      return;
    }

    if (buttonId === "star" && state.modeGroup !== "music") {
      state.faceEnabled = !state.faceEnabled;
      playAudio(state.faceEnabled ? "SFX_face_toggle_on.wav" : "SFX_face_toggle_off.wav", { category: "noncontent" });
      logEvent(state.faceEnabled ? "表情显示开启" : "表情显示关闭");
      render();
      return;
    }

    if (["single", "double", "timesDivide"].includes(buttonId) && state.modeGroup !== "music") {
      switchToCompare(buttonId);
    }
  }

  function handleShortPress(buttonId) {
    if (state.modeGroup === "music") {
      handleMusicControls(buttonId);
      return;
    }

    if (buttonId.startsWith("digit-")) {
      handleDigit(buttonId.slice("digit-".length));
      return;
    }

    if (buttonId === "timer") {
      cycleTimerSetting();
      return;
    }

    if (buttonId === "star") {
      switchToGame();
      return;
    }

    if (buttonId === "single") {
      switchToMath("singleAddSub");
      return;
    }

    if (buttonId === "double") {
      switchToMath("doubleAddSub");
      return;
    }

    if (buttonId === "timesDivide") {
      const next = state.lastMathMode === "multiply" ? "divide" : "multiply";
      switchToMath(next);
      return;
    }

    if (buttonId === "table99") {
      switchToTable99();
      return;
    }

    if (state.modeGroup === "table99") {
      return;
    }

    if (state.modeGroup === "compare") {
      handleCompareControls(buttonId);
      return;
    }

    if (state.modeGroup === "game") {
      handleGameControls(buttonId);
      return;
    }

    handleMathControls(buttonId);
  }

  function handleDigit(digit) {
    if (state.modeGroup === "game") {
      handleGameControls(`digit-${digit}`);
      return;
    }

    if (state.modeGroup === "table99") {
      return;
    }

    if (state.modeGroup === "compare") {
      return;
    }

    playAudio("SFX_key_press.wav", { category: "noncontent" });
    if (state.input.length >= 3) {
      render();
      return;
    }
    state.input += digit;
    render();
  }

  function handleMathControls(buttonId) {
    if (buttonId === "backspace") {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      state.input = state.input.slice(0, -1);
      render();
      return;
    }

    if (buttonId === "ok" || buttonId === "equal") {
      submitMathAnswer();
    }
  }

  function handleCompareControls(buttonId) {
    if (buttonId === "less") {
      state.compareSelection = "<";
      playAudio("SFX_compare_select.wav", { category: "noncontent" });
      render();
      return;
    }

    if (buttonId === "greater") {
      state.compareSelection = ">";
      playAudio("SFX_compare_select.wav", { category: "noncontent" });
      render();
      return;
    }

    if (buttonId === "equal") {
      state.compareSelection = "=";
      playAudio("SFX_compare_select.wav", { category: "noncontent" });
      render();
      return;
    }

    if (buttonId === "ok") {
      submitCompareAnswer();
    }
  }

  function handleGameControls(buttonId) {
    if (!state.question) {
      return;
    }

    if (state.gameSubmode === "memory") {
      handleMemoryControls(buttonId);
      return;
    }

    if (state.gameSubmode === "extreme") {
      handleExtremeControls(buttonId);
      return;
    }

    if (state.gameSubmode === "pattern") {
      handlePatternControls(buttonId);
      return;
    }

    if (state.gameSubmode === "guess") {
      handleGuessControls(buttonId);
    }
  }

  function handleMemoryControls(buttonId) {
    if (buttonId === "backspace" && state.question.stage === "recall") {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      state.input = state.input.slice(0, -1);
      render();
      return;
    }

    if ((buttonId === "ok" || buttonId === "equal") && state.question.stage === "recall") {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      const correct = state.input === state.question.sequence.join("");
      resolveGameQuestion(correct);
      return;
    }

    if (!buttonId.startsWith("digit-")) {
      return;
    }

    const digit = Number(buttonId.slice("digit-".length));
    playAudio("SFX_key_press.wav", { category: "noncontent" });

    if (state.question.stage === "memorize") {
      if (digit === state.question.sequence[0]) {
        state.question.stage = "recall";
        state.input = String(digit);
        render();
      } else {
        resolveGameQuestion(false);
      }
      return;
    }

    if (state.question.stage === "recall") {
      if (state.input.length < state.question.sequence.length) {
        state.input += String(digit);
      }
      render();
    }
  }

  function handleExtremeControls(buttonId) {
    if (buttonId === "backspace" && state.question.requiresSubmit) {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      state.input = state.input.slice(0, -1);
      render();
      return;
    }

    if ((buttonId === "ok" || buttonId === "equal") && state.question.requiresSubmit) {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      if (!state.input) {
        return;
      }
      resolveGameQuestion(Number(state.input) === state.question.answer);
      return;
    }

    if (!buttonId.startsWith("digit-")) {
      return;
    }
    playAudio("SFX_key_press.wav", { category: "noncontent" });
    const digit = buttonId.slice("digit-".length);

    if (state.question.requiresSubmit) {
      if (state.input.length < state.question.answerDigits) {
        state.input += digit;
      }
      render();
      return;
    }

    const entered = Number(digit);
    if (!state.question.numbers.includes(entered)) {
      return;
    }
    state.input = digit;
    resolveGameQuestion(entered === state.question.answer);
  }

  function handlePatternControls(buttonId) {
    if (buttonId === "backspace") {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      state.input = state.input.slice(0, -1);
      render();
      return;
    }

    if (buttonId === "ok" || buttonId === "equal") {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      resolveGameQuestion(state.input === String(state.question.answer));
      return;
    }

    if (!buttonId.startsWith("digit-")) {
      return;
    }

    playAudio("SFX_key_press.wav", { category: "noncontent" });
    state.input = buttonId.slice("digit-".length);
    render();
  }

  function handleGuessControls(buttonId) {
    if (buttonId === "backspace") {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      state.input = state.input.slice(0, -1);
      if (state.input) {
        state.lastGuessFeedback = null;
      }
      render();
      return;
    }

    if (buttonId === "ok" || buttonId === "equal") {
      playAudio("SFX_key_press.wav", { category: "noncontent" });
      submitGuess();
      return;
    }

    if (!buttonId.startsWith("digit-")) {
      return;
    }

    playAudio("SFX_key_press.wav", { category: "noncontent" });
    if (state.input.length >= 3) {
      render();
      return;
    }
    if (!state.input) {
      state.lastGuessFeedback = null;
    }
    state.input += buttonId.slice("digit-".length);
    render();
  }

  function handleMusicControls(buttonId) {
    if (buttonId.startsWith("digit-")) {
      const digit = buttonId.slice("digit-".length);
      playAudio(`SFX_music_note_${digit}.wav`, { category: "content" });
      handleMusicDigit(digit);
      return;
    }

    if (["star", "single", "double", "timesDivide", "table99"].includes(buttonId)) {
      const nextSong = MUSIC_SONGS.find((song) => song.button === buttonId);
      if (nextSong) {
        playAudio("SFX_mode_switch.wav", { category: "content" });
        state.musicSongKey = nextSong.key;
        state.musicPageIndex = 0;
        state.musicSolvedCount = 0;
        logEvent(`切歌：${nextSong.label}`);
        render();
      }
      return;
    }

    if (buttonId === "less") {
      if (state.musicPageIndex > 0) {
        playAudio("SFX_music_page.wav", { category: "content" });
        state.musicPageIndex -= 1;
        state.musicSolvedCount = 0;
      }
      render();
      return;
    }

    if (buttonId === "greater") {
      const song = currentSong();
      if (state.musicPageIndex < song.pages.length - 1) {
        playAudio("SFX_music_page.wav", { category: "content" });
        state.musicPageIndex += 1;
        state.musicSolvedCount = 0;
      }
      render();
      return;
    }

    if (buttonId === "ok") {
      state.musicPageIndex = 0;
      state.musicSolvedCount = 0;
      render();
      return;
    }
  }

  function handleMusicDigit(digit) {
    const page = currentSong().pages[state.musicPageIndex] || "";
    const requiredNotes = page.split("").filter((char) => char !== "0");
    const expected = requiredNotes[state.musicSolvedCount];
    if (digit === expected) {
      state.musicSolvedCount += 1;
      if (state.musicSolvedCount >= requiredNotes.length) {
        window.clearTimeout(runtime.delayedAdvanceTimeout);
        runtime.delayedAdvanceTimeout = window.setTimeout(() => {
          const song = currentSong();
          if (state.modeGroup !== "music") {
            return;
          }
          if (state.musicPageIndex < song.pages.length - 1) {
            state.musicPageIndex += 1;
            state.musicSolvedCount = 0;
          }
          render();
        }, 420);
      }
    }
    render();
  }

  function cycleTimerSetting() {
    if (!["math", "compare"].includes(state.modeGroup)) {
      return;
    }
    const currentIndex = TIMER_CYCLE.indexOf(state.timerSetting);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % TIMER_CYCLE.length;
    state.timerSetting = TIMER_CYCLE[nextIndex];
    playAudio("SFX_key_press.wav", { category: "noncontent" });
    if (state.timerSetting === 0) {
      clearInterval(runtime.countdownInterval);
      runtime.countdownInterval = null;
      state.timerRemaining = 0;
      state.timerExpired = false;
    } else {
      startCountdownForQuestion();
    }
    logEvent(`倒计时切到 ${state.timerSetting === 0 ? "关闭" : `${state.timerSetting}s`}`);
    render();
  }

  function switchToMath(mode) {
    state.modeGroup = "math";
    state.currentMathMode = mode;
    state.lastMathMode = mode;
    state.lastNormalMode = { modeGroup: "math", currentMathMode: mode };
    state.progress = 0;
    state.correctCount = 0;
    state.input = "";
    state.compareSelection = "";
    state.faceMood = "idle";
    state.awaitingAdvance = null;
    state.roundQuestionKeys = [];
    clearInterval(runtime.table99Interval);
    runtime.table99Interval = null;
    playAudio("SFX_mode_switch.wav", { category: "content" });
    state.question = generateQuestionForCurrentMode();
    scheduleQuestionSpeech(560);
    logEvent(`切到 ${modeLabel(mode)}`);
    startCountdownForQuestion();
    render();
  }

  function switchToCompare(buttonId) {
    const compareSource =
      buttonId === "single"
        ? "singleAddSub"
        : buttonId === "double"
          ? "doubleAddSub"
          : ["multiply", "divide"].includes(state.lastMathMode)
            ? state.lastMathMode
            : "multiply";

    state.modeGroup = "compare";
    state.currentMathMode = compareSource;
    state.progress = 0;
    state.correctCount = 0;
    state.input = "";
    state.compareSelection = "";
    state.faceMood = "idle";
    state.awaitingAdvance = null;
    state.roundQuestionKeys = [];
    clearInterval(runtime.table99Interval);
    runtime.table99Interval = null;
    playAudio("SFX_mode_switch.wav", { category: "content" });
    state.question = generateQuestionForCurrentMode();
    scheduleQuestionSpeech(560);
    logEvent(`长按进入 ${modeLabel(compareSource)} 比大小`);
    startCountdownForQuestion();
    render();
  }

  function switchToGame() {
    const nextSubmode = state.modeGroup === "game" ? nextGameSubmode(state.gameSubmode) : state.gameSubmode;
    state.modeGroup = "game";
    state.gameSubmode = nextSubmode;
    state.lastNormalMode = { modeGroup: "game", gameSubmode: nextSubmode };
    state.progress = 0;
    state.correctCount = 0;
    state.input = "";
    state.compareSelection = "";
    state.faceMood = "idle";
    state.awaitingAdvance = null;
    clearInterval(runtime.countdownInterval);
    runtime.countdownInterval = null;
    state.timerRemaining = 0;
    state.timerExpired = false;
    playAudio("SFX_mode_switch.wav", { category: "content" });
    beginCurrentQuestion(false);
    logEvent(`切到游戏模式：${gameLabel(nextSubmode)}`);
    render();
  }

  function switchToTable99() {
    state.modeGroup = "table99";
    state.progress = 0;
    state.correctCount = 0;
    state.input = "";
    state.compareSelection = "";
    state.faceMood = "idle";
    state.awaitingAdvance = null;
    clearInterval(runtime.countdownInterval);
    runtime.countdownInterval = null;
    state.timerRemaining = 0;
    state.timerExpired = false;
    state.table99Index = 0;
    playAudio("SFX_mode_switch.wav", { category: "content" });
    scheduleAudioWhenReady(() => startTable99Playback(), {
      delayMs: 560,
      priority: 2,
    });
    logEvent("切到九九乘法表");
    render();
  }

  function toggleMusicMode() {
    clearInterval(runtime.countdownInterval);
    runtime.countdownInterval = null;
    state.timerRemaining = 0;
    state.timerExpired = false;

    if (state.modeGroup === "music") {
      playAudio("SFX_music_exit.wav", { category: "content" });
      const restore = state.lastNormalMode.modeGroup === "game" ? "singleAddSub" : state.lastNormalMode.currentMathMode || "singleAddSub";
      state.modeGroup = "math";
      state.currentMathMode = restore;
      state.lastMathMode = restore;
      state.progress = 0;
      state.correctCount = 0;
      state.input = "";
      state.compareSelection = "";
      state.faceMood = "idle";
      state.awaitingAdvance = null;
      state.roundQuestionKeys = [];
      state.question = generateQuestionForCurrentMode();
      scheduleQuestionSpeech(560);
      startCountdownForQuestion();
      logEvent(`退出音乐模式，回到 ${modeLabel(restore)}`);
      render();
      return;
    }

    state.lastNormalMode =
      state.modeGroup === "math" || state.modeGroup === "compare"
        ? { modeGroup: "math", currentMathMode: state.currentMathMode }
        : { modeGroup: "math", currentMathMode: "singleAddSub" };

    state.modeGroup = "music";
    state.musicSongKey = "song1";
    state.musicPageIndex = 0;
    state.musicSolvedCount = 0;
    state.faceMood = "idle";
    state.awaitingAdvance = null;
    clearInterval(runtime.table99Interval);
    runtime.table99Interval = null;
    playAudio("SFX_music_enter.wav", { category: "content" });
    logEvent("进入隐藏音乐模式");
    render();
  }

  function startTable99Playback() {
    clearInterval(runtime.table99Interval);
    runtime.table99Interval = null;
    const started = playAudio("VO_table99.mp3", { category: "content", priority: 2 });
    if (!started) {
      return false;
    }
    runtime.table99Interval = window.setInterval(() => {
      if (state.modeGroup !== "table99") {
        clearInterval(runtime.table99Interval);
        runtime.table99Interval = null;
        return;
      }
      state.table99Index = (state.table99Index + 1) % TABLE_99_SEQUENCE.length;
      render();
    }, 1500);
    return true;
  }

  function beginCurrentQuestion(skipPrompt) {
    state.input = "";
    state.compareSelection = "";
    state.faceMood = "idle";
    if (state.gameSubmode === "memory") {
      state.question = generateMemoryQuestion(state.correctCount);
    } else if (state.gameSubmode === "extreme") {
      state.question = generateExtremeQuestion(state.correctCount);
    } else if (state.gameSubmode === "pattern") {
      state.question = generatePatternQuestion(state.correctCount);
    } else if (state.gameSubmode === "guess") {
      startGuessNumber();
      return;
    }

    if (!skipPrompt || state.gameSubmode === "extreme") {
      playGamePrompt();
    }
    render();
  }

  function startGuessNumber() {
    state.modeGroup = "game";
    state.gameSubmode = "guess";
    state.input = "";
    state.faceMood = "idle";
    state.guessAttemptsLeft = 10;
    state.lastGuessFeedback = null;
    state.question = {
      kind: "guess",
      answer: randomInt(1, 100),
      lastGuess: "",
    };
    playAudio("VO_guess_number.mp3", { category: "content" });
    logEvent("新一轮猜数字开始");
    render();
  }

  function submitMathAnswer() {
    if (!state.input) {
      resolveMathQuestion(false);
      render();
      return;
    }

    const numericInput = Number(state.input);
    const correct = numericInput === state.question.answer;
    resolveMathQuestion(correct);
  }

  function submitCompareAnswer() {
    if (!state.compareSelection) {
      resolveMathQuestion(false, true);
      render();
      return;
    }

    const correct = state.compareSelection === state.question.relation;
    resolveMathQuestion(correct, true);
  }

  function submitGuess() {
    if (!state.input) {
      return;
    }

    const guess = Number(state.input);
    state.question.lastGuess = state.input;
    if (guess === state.question.answer) {
      state.faceMood = "happy";
      playAudio("SFX_correct.wav", { category: "noncontent" });
      logEvent("猜数字答对");
      window.clearTimeout(runtime.delayedAdvanceTimeout);
      runtime.delayedAdvanceTimeout = window.setTimeout(() => {
        startGuessNumber();
      }, 950);
      render();
      return;
    }

    state.guessAttemptsLeft -= 1;
    if (guess > state.question.answer) {
      state.lastGuessFeedback = "tooHigh";
      playAudio("VO_too_high.mp3", { category: "content" });
      logEvent("猜大了");
    } else {
      state.lastGuessFeedback = "tooLow";
      playAudio("VO_too_low.mp3", { category: "content" });
      logEvent("猜小了");
    }

    if (state.guessAttemptsLeft <= 0) {
      state.faceMood = "sad";
      playAudio("SFX_game_lose.mp3", { category: "noncontent" });
      state.awaitingAdvance = "guessLose";
    }
    render();
  }

  function resolveMathQuestion(correct, compareMode) {
    state.progress += 1;
    const answerBefore = state.question.answer;
    if (correct) {
      state.correctCount += 1;
      state.faceMood = "happy";
      if (compareMode) {
        state.compareSelection = state.question.relation;
      } else {
        state.input = String(answerBefore);
      }
      playAudio("SFX_correct.wav", { category: "noncontent" });
      maybePlayStarReward();
      if (state.progress >= 50) {
        finishMathRound();
      } else {
        scheduleAutoNext(() => {
          state.faceMood = "idle";
          state.input = "";
          state.compareSelection = "";
          state.question = generateQuestionForCurrentMode();
          startCountdownForQuestion();
          scheduleQuestionSpeech(0);
          render();
        }, 900);
      }
    } else {
      state.faceMood = "sad";
      if (compareMode) {
        state.compareSelection = state.question.relation;
      } else {
        state.input = String(answerBefore);
      }
      playAudio("SFX_wrong.wav", { category: "noncontent" });
      state.awaitingAdvance = state.progress >= 50 ? "mathRoundEndWrong" : "mathWrong";
    }
    render();
  }

  function maybePlayStarReward() {
    const rewards = {
      10: "SFX_star_1.wav",
      20: "SFX_star_2.wav",
      30: "SFX_star_3.wav",
      40: "SFX_star_4.wav",
      50: "SFX_star_5.wav",
    };
    const reward = rewards[state.correctCount];
    if (!reward) {
      return;
    }
    runtime.pendingAudioTimeout = window.setTimeout(() => {
      playAudio(reward, { category: "noncontent" });
    }, 220);
  }

  function finishMathRound() {
    const perfect = state.correctCount === 50;
    scheduleAutoNext(() => {
      if (!perfect) {
        playAudio("SFX_round_complete.mp3", { category: "noncontent" });
      }
      state.progress = 0;
      state.correctCount = 0;
      state.input = "";
      state.compareSelection = "";
      state.faceMood = "idle";
      state.roundQuestionKeys = [];
      state.question = generateQuestionForCurrentMode();
      startCountdownForQuestion();
      scheduleQuestionSpeech(perfect ? 0 : 620);
      render();
    }, perfect ? 1200 : 1200);
  }

  function resolveGameQuestion(correct) {
    state.progress += 1;
    if (correct) {
      state.correctCount += 1;
      state.faceMood = "happy";
      playAudio("SFX_correct.wav", { category: "noncontent" });
      if (state.progress >= 10 && state.gameSubmode !== "guess") {
        finishGameRound();
      } else {
        scheduleAutoNext(() => {
          state.faceMood = "idle";
          beginCurrentQuestion(true);
        }, 900);
      }
    } else {
      state.faceMood = "sad";
      playAudio("SFX_wrong.wav", { category: "noncontent" });
      state.awaitingAdvance = state.progress >= 10 ? "gameRoundEndWrong" : "gameWrong";
    }
    render();
  }

  function finishGameRound() {
    const win = state.correctCount > 5;
    playAudio(win ? "SFX_game_win.mp3" : "SFX_game_lose.mp3", { category: "noncontent" });
    logEvent(win ? "本轮游戏胜利" : "本轮游戏失败");
    scheduleAutoNext(() => {
      state.progress = 0;
      state.correctCount = 0;
      state.faceMood = "idle";
      beginCurrentQuestion(true);
      render();
    }, 1200);
  }

  function scheduleAutoNext(callback, delayMs) {
    window.clearTimeout(runtime.delayedAdvanceTimeout);
    runtime.delayedAdvanceTimeout = window.setTimeout(callback, delayMs);
  }

  function generateQuestionForCurrentMode() {
    return state.modeGroup === "compare"
      ? generateUniqueRoundQuestion(
          () => generateCompareQuestion(state.currentMathMode, state.correctCount),
          (question) => questionSignature(question, "compare", state.currentMathMode),
        )
      : generateUniqueRoundQuestion(
          () => generateMathQuestion(state.currentMathMode, state.correctCount),
          (question) => questionSignature(question, "math", state.currentMathMode),
        );
  }

  function generateUniqueRoundQuestion(factory, signatureBuilder) {
    const usedKeys = new Set(state.roundQuestionKeys || []);
    let fallbackQuestion = null;

    for (let attempt = 0; attempt < 240; attempt += 1) {
      const candidate = factory();
      const signature = signatureBuilder(candidate);
      fallbackQuestion = candidate;
      if (!usedKeys.has(signature)) {
        state.roundQuestionKeys.push(signature);
        return candidate;
      }
    }

    return fallbackQuestion || factory();
  }

  function questionSignature(question, modeGroup, mode) {
    if (!question) {
      return "";
    }

    if (modeGroup === "compare" || question.kind === "compare") {
      return [
        "compare",
        mode,
        question.operator,
        question.left,
        question.right,
        question.relation,
        question.compareTarget,
      ].join("|");
    }

    if (modeGroup === "math" || question.kind === "math") {
      return ["math", mode, question.operator, question.left, question.right].join("|");
    }

    return `${question.kind}|${JSON.stringify(question)}`;
  }

  function generateMathQuestion(mode, correctCount) {
    const difficulty = mathDifficulty(correctCount);
    if (mode === "singleAddSub") {
      return generateSingleAddSub(difficulty);
    }
    if (mode === "doubleAddSub") {
      return generateDoubleAddSub(difficulty);
    }
    if (mode === "multiply") {
      return generateMultiply(difficulty);
    }
    return generateDivide(difficulty);
  }

  function generateCompareQuestion(mode, correctCount) {
    const base = generateMathQuestion(mode, correctCount);
    let relation = randomPick(["<", ">", "="], [0.4, 0.4, 0.2]);
    let compareTarget = base.answer;
    if (relation === "=") {
      compareTarget = base.answer;
    } else if (relation === "<") {
      compareTarget = clamp(base.answer + randomInt(1, Math.max(2, Math.min(25, 999 - base.answer))), 0, 999);
    } else {
      compareTarget = clamp(base.answer - randomInt(1, Math.max(1, Math.min(25, base.answer || 1))), 0, 999);
      if (compareTarget === base.answer) {
        compareTarget = Math.max(0, base.answer - 1);
      }
    }
    return {
      ...base,
      kind: "compare",
      compareTarget,
      relation,
    };
  }

  function generateSingleAddSub(level) {
    if (level === 0) {
      const a = randomInt(1, 9);
      const b = randomInt(1, 10 - a);
      return mathQuestion("+", a, b);
    }
    if (level === 1) {
      let a = 1;
      let b = 1;
      do {
        a = randomInt(1, 9);
        b = randomInt(1, 9);
      } while (a + b < 10 || a + b > 18);
      return mathQuestion("+", a, b);
    }
    if (level === 2) {
      if (Math.random() > 0.5) {
        let a = 1;
        let b = 1;
        do {
          a = randomInt(1, 9);
          b = randomInt(1, 9);
        } while (a + b > 10);
        return mathQuestion("+", a, b);
      }
      const a = randomInt(1, 10);
      const b = randomInt(0, a);
      return mathQuestion("-", a, b);
    }
    if (Math.random() > 0.5) {
      const a = randomInt(1, 9);
      const b = randomInt(1, 9);
      return mathQuestion("+", a, b);
    }
    const a = randomInt(10, 18);
    const b = randomInt(0, Math.min(9, a));
    return mathQuestion("-", a, b);
  }

  function generateDoubleAddSub(level) {
    if (level === 0) {
      if (Math.random() > 0.5) {
        let a = 10;
        let b = 10;
        do {
          a = randomInt(10, 59);
          b = randomInt(10, 39);
        } while ((a % 10) + (b % 10) >= 10 || Math.floor(a / 10) + Math.floor(b / 10) >= 10);
        return mathQuestion("+", a, b);
      }
      let a = 10;
      let b = 10;
      do {
        a = randomInt(20, 99);
        b = randomInt(10, a);
      } while ((a % 10) < (b % 10));
      return mathQuestion("-", a, b);
    }

    if (level === 1) {
      if (Math.random() > 0.5) {
        let a = 10;
        let b = 10;
        do {
          a = randomInt(10, 79);
          b = randomInt(10, 29);
        } while ((a % 10) + (b % 10) < 10 || Math.floor(a / 10) + Math.floor(b / 10) >= 9);
        return mathQuestion("+", a, b);
      }
      let a = 20;
      let b = 10;
      do {
        a = randomInt(20, 99);
        b = randomInt(10, a - 1);
      } while ((a % 10) >= (b % 10));
      return mathQuestion("-", a, b);
    }

    if (level === 2) {
      if (Math.random() > 0.5) {
        let a = 40;
        let b = 40;
        do {
          a = randomInt(40, 99);
          b = randomInt(30, 99);
        } while ((a % 10) + (b % 10) < 10 || Math.floor(a / 10) + Math.floor(b / 10) < 9 || a + b > 199);
        return mathQuestion("+", a, b);
      }
      let a = 30;
      let b = 10;
      do {
        a = randomInt(30, 99);
        b = randomInt(10, a - 1);
      } while ((a % 10) >= (b % 10));
      return mathQuestion("-", a, b);
    }

    if (Math.random() > 0.5) {
      const a = randomInt(10, 99);
      const b = randomInt(10, 99);
      return mathQuestion("+", a, b);
    }
    const a = randomInt(10, 99);
    const b = randomInt(0, a);
    return mathQuestion("-", a, b);
  }

  function generateMultiply(level) {
    if (level === 0) {
      const a = randomInt(1, 9);
      const b = randomInt(2, 5);
      return mathQuestion("×", a, b);
    }
    if (level === 1) {
      const a = randomInt(1, 9);
      const b = randomInt(2, 9);
      return mathQuestion("×", a, b);
    }
    if (level === 2) {
      let a = 10;
      let b = 2;
      do {
        a = randomInt(10, 33);
        b = randomInt(2, 9);
      } while (a * b > 99);
      return mathQuestion("×", a, b);
    }
    let a = 12;
    let b = 2;
    do {
      a = randomInt(12, 99);
      b = randomInt(2, 9);
    } while (a * b > 999);
    return mathQuestion("×", a, b);
  }

  function generateDivide(level) {
    if (level === 0) {
      let divisor = 2;
      let quotient = 1;
      do {
        divisor = randomInt(2, 5);
        quotient = randomInt(1, 10);
      } while (divisor * quotient > 20);
      return mathQuestion("÷", divisor * quotient, divisor);
    }
    if (level === 1) {
      let divisor = 2;
      let quotient = 1;
      do {
        divisor = randomInt(2, 9);
        quotient = randomInt(1, 25);
      } while (divisor * quotient > 50);
      return mathQuestion("÷", divisor * quotient, divisor);
    }
    if (level === 2) {
      let divisor = 2;
      let quotient = 1;
      do {
        divisor = randomInt(2, 9);
        quotient = randomInt(1, 40);
      } while (divisor * quotient > 81);
      return mathQuestion("÷", divisor * quotient, divisor);
    }

    let divisor = 10;
    let quotient = 2;
    do {
      divisor = randomInt(10, 25);
      quotient = randomInt(2, 9);
    } while (divisor * quotient > 99);
    return mathQuestion("÷", divisor * quotient, divisor);
  }

  function generateMemoryQuestion(correctCount) {
    const length = correctCount <= 1 ? 3 : correctCount <= 3 ? 4 : correctCount <= 5 ? 5 : correctCount <= 7 ? 6 : 7;
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7]).slice(0, length);
    return {
      kind: "memory",
      stage: "memorize",
      sequence: digits,
    };
  }

  function generateExtremeQuestion(correctCount) {
    const target = Math.random() > 0.5 ? "largest" : "smallest";
    let numbers = [];

    if (correctCount < 3) {
      numbers = [randomInt(1, 3), randomInt(4, 6), randomInt(7, 9)];
    } else if (correctCount < 6) {
      while (numbers.length < 3) {
        const candidate = randomInt(1, 9);
        if (!numbers.includes(candidate)) {
          numbers.push(candidate);
        }
      }
    } else {
      while (numbers.length < 3) {
        const candidate = randomInt(10, 99);
        if (!numbers.includes(candidate)) {
          numbers.push(candidate);
        }
      }
    }

    numbers = shuffle(numbers);

    const answer = target === "largest" ? Math.max(...numbers) : Math.min(...numbers);
    return {
      kind: "extreme",
      target,
      numbers,
      answer,
      answerDigits: String(answer).length,
      requiresSubmit: answer >= 10,
    };
  }

  function generatePatternQuestion(correctCount) {
    let sequence = [];
    let answer = 0;
    let label = "";

    if (correctCount < 3) {
      const start = randomInt(1, 4);
      const step = randomInt(1, 2);
      sequence = [start, start + step, start + step * 2, start + step * 3].map((value) => value % 10);
      answer = (start + step * 4) % 10;
      if (answer === 0) {
        answer = step;
      }
      label = "等差";
    } else if (correctCount < 6) {
      if (Math.random() > 0.5) {
        const first = randomInt(1, 4);
        const second = randomInt(5, 7);
        sequence = [first, second, first, second];
        answer = first;
        label = "交替";
      } else {
        const start = randomInt(1, 3);
        const step = randomInt(2, 3);
        sequence = [start, start + step, start + step * 2].map((value) => value % 10);
        answer = (start + step * 3) % 10;
        if (answer === 0) {
          answer = step;
        }
        label = "跳数";
      }
    } else {
      const start = randomInt(1, 3);
      sequence = [start, start * 2, start * 4].map((value) => value % 10);
      answer = (start * 8) % 10;
      if (answer === 0) {
        answer = start;
      }
      label = "倍增";
    }

    return {
      kind: "pattern",
      sequence,
      answer,
      label,
    };
  }

  function mathQuestion(operator, left, right) {
    return {
      kind: "math",
      operator,
      left,
      right,
      answer: calculate(operator, left, right),
    };
  }

  function calculate(operator, left, right) {
    if (operator === "+") {
      return left + right;
    }
    if (operator === "-") {
      return left - right;
    }
    if (operator === "×") {
      return left * right;
    }
    return Math.floor(left / right);
  }

  function mathDifficulty(correctCount) {
    if (correctCount < 10) return 0;
    if (correctCount < 20) return 1;
    if (correctCount < 30) return 2;
    return 3;
  }

  function nextGameSubmode(current) {
    const order = ["memory", "extreme", "pattern", "guess"];
    const index = order.indexOf(current);
    return order[(index + 1) % order.length];
  }

  function playGamePrompt() {
    let fileName = "";
    if (state.gameSubmode === "memory") {
      fileName = "VO_remember.mp3";
    } else if (state.gameSubmode === "extreme") {
      fileName = state.question.target === "largest" ? "VO_find_largest.mp3" : "VO_find_smallest.mp3";
    } else if (state.gameSubmode === "pattern") {
      fileName = "VO_find_pattern.mp3";
    } else if (state.gameSubmode === "guess") {
      fileName = "VO_guess_number.mp3";
    }
    scheduleAudioWhenReady(() => playAudio(fileName, { category: "content", priority: 2 }), {
      delayMs: 560,
      priority: 2,
    });
  }

  function scheduleQuestionSpeech(delayMs) {
    if (!state.powered || state.sleeping || !state.question || !["math", "compare"].includes(state.modeGroup)) {
      return;
    }
    scheduleAudioWhenReady(() => playQuestionSpeech(), {
      delayMs,
      priority: 2,
    });
  }

  function playQuestionSpeech() {
    const sequence = buildQuestionSpeechSequence(state.question, state.modeGroup);
    if (!sequence.length) {
      return false;
    }
    return playAudioSequence(sequence, { category: "content", priority: 2 });
  }

  function scheduleAudioWhenReady(action, options = {}) {
    const { delayMs = 0, priority = 2, retryMs = 120, maxAttempts = 40 } = options;
    clearAudioTimeout();

    const attempt = (remaining) => {
      runtime.pendingAudioTimeout = null;
      if (!state.powered || state.sleeping) {
        return;
      }
      if (!shouldStartAudio(priority, false)) {
        if (remaining <= 0) {
          return;
        }
        runtime.pendingAudioTimeout = window.setTimeout(() => {
          attempt(remaining - 1);
        }, retryMs);
        return;
      }

      const started = action();
      if (started === false && remaining > 0) {
        runtime.pendingAudioTimeout = window.setTimeout(() => {
          attempt(remaining - 1);
        }, retryMs);
      }
    };

    runtime.pendingAudioTimeout = window.setTimeout(() => {
      attempt(maxAttempts);
    }, Math.max(0, delayMs || 0));
  }

  function buildQuestionSpeechSequence(question, modeGroup) {
    if (!question || !["math", "compare"].includes(modeGroup)) {
      return [];
    }
    const sequence = [];
    appendNumberSpeech(sequence, question.left, 100);
    sequence.push({ fileName: operatorSpeechFile(question.operator), gapAfterMs: 100 });
    appendNumberSpeech(sequence, question.right, modeGroup === "math" ? 100 : 0);
    if (modeGroup === "math") {
      sequence.push({ fileName: "VO_op_equals.mp3", gapAfterMs: 0 });
    }
    return sequence.filter((item) => item.fileName);
  }

  function appendNumberSpeech(sequence, value, trailingGapMs) {
    const parts = speechFilesForNumber(value);
    parts.forEach((fileName, index) => {
      sequence.push({
        fileName,
        gapAfterMs: index === parts.length - 1 ? trailingGapMs : 50,
      });
    });
  }

  function speechFilesForNumber(value) {
    if (value >= 0 && value <= 20) {
      return [`VO_num_${value}.mp3`];
    }
    if (value > 20 && value < 100) {
      const tens = Math.floor(value / 10) * 10;
      const ones = value % 10;
      return ones ? [`VO_num_${tens}.mp3`, `VO_num_${ones}.mp3`] : [`VO_num_${tens}.mp3`];
    }
    return String(value)
      .split("")
      .filter((char) => /\d/.test(char))
      .map((char) => `VO_num_${char}.mp3`);
  }

  function operatorSpeechFile(operator) {
    if (operator === "+") return "VO_op_plus.mp3";
    if (operator === "-") return "VO_op_minus.mp3";
    if (operator === "×") return "VO_op_times.mp3";
    if (operator === "÷") return "VO_op_divided_by.mp3";
    return "";
  }

  function playAudio(fileName, options = {}) {
    const { category = "noncontent", force = false } = options;
    const priority = options.priority ?? inferAudioPriority(fileName);
    if (!shouldStartAudio(priority, force)) {
      return false;
    }
    clearAudioTimeout();
    stopCurrentAudio();
    const source = resolveAudioSource(fileName);
    if (!source) {
      updateAudioHint(`缺少音频：${fileName}`);
      return false;
    }

    startAudioPlayback(fileName, source, { category, priority });
    return true;
  }

  function playAudioSequence(sequence, options = {}) {
    if (!sequence.length) {
      return false;
    }
    const { category = "content", force = false } = options;
    const priority = options.priority ?? 2;
    if (!shouldStartAudio(priority, force)) {
      return false;
    }
    clearAudioTimeout();
    stopCurrentAudio();
    runtime.activeSequence = {
      items: sequence.slice(),
      index: 0,
      category,
      priority,
    };
    runtime.currentAudioPriority = priority;
    runtime.sequenceToken += 1;
    playNextSequenceItem(runtime.sequenceToken);
    return true;
  }

  function playNextSequenceItem(token) {
    if (!runtime.activeSequence || token !== runtime.sequenceToken) {
      return;
    }

    const item = runtime.activeSequence.items[runtime.activeSequence.index];
    if (!item) {
      runtime.activeSequence = null;
      runtime.currentAudioPriority = 0;
      runtime.currentAudioName = "";
      runtime.currentAudioSourceKind = "";
      renderAudioTable();
      return;
    }

    const source = resolveAudioSource(item.fileName);
    if (!source) {
      runtime.activeSequence.index += 1;
      updateAudioHint(`缺少音频：${item.fileName}`);
      const gapAfterMs = item.gapAfterMs || 0;
      if (runtime.activeSequence.index >= runtime.activeSequence.items.length) {
        runtime.activeSequence = null;
        runtime.currentAudioPriority = 0;
        runtime.currentAudioName = "";
        runtime.currentAudioSourceKind = "";
        renderAudioTable();
        return;
      }
      runtime.sequenceAudioTimeout = window.setTimeout(() => {
        playNextSequenceItem(token);
      }, gapAfterMs);
      return;
    }

    startAudioPlayback(item.fileName, source, {
      category: runtime.activeSequence.category,
      priority: runtime.activeSequence.priority,
      onEnded: () => {
        if (!runtime.activeSequence || token !== runtime.sequenceToken) {
          return;
        }
        const gapAfterMs = item.gapAfterMs || 0;
        runtime.activeSequence.index += 1;
        if (runtime.activeSequence.index >= runtime.activeSequence.items.length) {
          runtime.activeSequence = null;
          runtime.currentAudioPriority = 0;
          runtime.currentAudioName = "";
          runtime.currentAudioSourceKind = "";
          renderAudioTable();
          return;
        }
        runtime.sequenceAudioTimeout = window.setTimeout(() => {
          playNextSequenceItem(token);
        }, gapAfterMs);
      },
    });
  }

  function shouldStartAudio(priority, force) {
    if (force) {
      return true;
    }
    return !runtime.currentAudioPriority || priority >= runtime.currentAudioPriority;
  }

  function startAudioPlayback(fileName, source, options = {}) {
    const { category = "noncontent", priority = inferAudioPriority(fileName), onEnded = null } = options;
    const audio = new Audio(source.url);
    runtime.currentAudio = audio;
    runtime.currentAudioName = fileName;
    runtime.currentAudioCategory = category;
    runtime.currentAudioSourceKind = source.kind;
    runtime.currentAudioPriority = priority;
    applyCurrentAudioVolume();
    audio.play().catch(() => {});
    audio.addEventListener("ended", () => {
      if (runtime.currentAudio === audio) {
        runtime.currentAudio = null;
        runtime.currentAudioName = "";
        runtime.currentAudioSourceKind = "";
        if (!runtime.activeSequence) {
          runtime.currentAudioPriority = 0;
        }
      }
      if (onEnded) {
        onEnded();
      }
      renderAudioTable();
    });
    updateAudioHint(`当前播放：${fileName} (${source.kind === "imported" ? "导入" : "默认"})`);
    renderAudioTable();
  }

  function stopCurrentAudio() {
    clearSequenceAudioTimeout();
    runtime.sequenceToken += 1;
    runtime.activeSequence = null;
    runtime.currentAudioPriority = 0;
    if (!runtime.currentAudio) {
      runtime.currentAudioName = "";
      runtime.currentAudioSourceKind = "";
      return;
    }
    runtime.currentAudio.pause();
    runtime.currentAudio.currentTime = 0;
    runtime.currentAudio = null;
    runtime.currentAudioName = "";
    runtime.currentAudioSourceKind = "";
  }

  function applyCurrentAudioVolume() {
    if (!runtime.currentAudio) {
      return;
    }
    runtime.currentAudio.volume = volumeForCategory(runtime.currentAudioCategory);
  }

  function volumeForCategory(category) {
    const content = category === "content";
    if (state.volume === "high") {
      return content ? 1 : 0.92;
    }
    if (state.volume === "low") {
      return content ? 0.54 : 0.42;
    }
    if (state.volume === "mute") {
      return content ? 0.18 : 0;
    }
    return 0;
  }

  function resolveAudioSource(fileName) {
    const variants = fileNameVariants(fileName);
    for (const variant of variants) {
      if (runtime.importedAudio.has(variant)) {
        return { url: runtime.importedAudio.get(variant), kind: "imported" };
      }
    }
    for (const variant of variants) {
      if (window.TOY_DEFAULT_AUDIO[variant]) {
        return { url: window.TOY_DEFAULT_AUDIO[variant], kind: "default" };
      }
    }
    return null;
  }

  function fileNameVariants(fileName) {
    const base = fileName.replace(/\.(mp3|wav)$/i, "");
    const prefixed = [];
    if (base.startsWith("VO_")) {
      prefixed.push(base.replace(/^VO_/, "VOX_"));
    }
    if (base.startsWith("VOX_")) {
      prefixed.push(base.replace(/^VOX_/, "VO_"));
    }
    const all = [base, ...prefixed];
    const variants = new Set();
    all.forEach((name) => {
      variants.add(name);
      variants.add(`${name}.mp3`);
      variants.add(`${name}.wav`);
    });
    return Array.from(variants);
  }

  function importAudioFiles(files) {
    if (!files.length) {
      return;
    }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      runtime.importedAudio.set(file.name, url);
    });
    els.audioImportSummary.textContent = `已导入 ${runtime.importedAudio.size} 个文件，将优先覆盖默认资源。`;
    logEvent(`导入 ${files.length} 个音频文件`);
    renderAudioTable();
  }

  function clearImportedAudio() {
    runtime.importedAudio.forEach((url) => URL.revokeObjectURL(url));
    runtime.importedAudio.clear();
    els.audioImport.value = "";
    els.audioImportSummary.textContent = "当前使用仓库默认音频。";
    renderAudioTable();
  }

  function runQueryPreset() {
    const params = new URLSearchParams(window.location.search);
    const autoBoot = params.get("autoboot");
    const autoPress = params.get("autopress");
    if (!autoBoot && !autoPress) {
      return;
    }

    let delay = 60;
    if (["mute", "low", "high"].includes(autoBoot)) {
      window.setTimeout(() => {
        setVolume(autoBoot);
      }, delay);
      delay += 180;
    }

    if (autoPress) {
      autoPress
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((buttonId) => {
          window.setTimeout(() => {
            handleToyButton(buttonId, false);
          }, delay);
          delay += 180;
        });
    }
  }

  function renderAudioTable() {
    const rows = window.TOY_AUDIO_REQUIREMENTS.filter((item) => {
      if (!state.audioSearch) {
        return true;
      }
      const haystack = [item.fileName, item.trigger, item.section, item.copy].join(" ").toLowerCase();
      return haystack.includes(state.audioSearch);
    });

    const availableCount = rows.filter((row) => !!resolveRequirementAudio(row).source).length;
    els.audioStats.textContent = `${availableCount}/${rows.length} 条可预览`;
    els.audioTable.innerHTML = "";

    rows.forEach((row) => {
      const resolved = resolveRequirementAudio(row);
      const source = resolved.source;
      const wrapper = document.createElement("article");
      wrapper.className = "audio-row";
      if (!source) {
        wrapper.classList.add("is-missing");
      } else {
        wrapper.classList.add(source.kind === "imported" ? "is-imported" : "is-default");
      }
      wrapper.innerHTML = `
        <span class="audio-row__badge">${row.id}</span>
        <div class="audio-row__meta">
          <strong>${escapeHtml(row.fileName)}</strong>
          <span>${escapeHtml(row.trigger.replace(/\n/g, " / "))}</span>
          <small>${escapeHtml(row.section)} · ${escapeHtml(row.duration || "未标注")}</small>
        </div>
        <span class="audio-row__status">${source ? (source.kind === "imported" ? "导入" : "默认") : "缺失"}</span>
        <button class="audio-row__play" ${source ? "" : "disabled"}>播放</button>
      `;
      const playButton = wrapper.querySelector(".audio-row__play");
      playButton.addEventListener("click", () => {
        playAudio(resolved.playFile, {
          category: inferAudioCategory(resolved.playFile),
          force: true,
        });
      });
      els.audioTable.appendChild(wrapper);
    });
  }

  function resolveRequirementAudio(row) {
    if (row.id === "44-N" || row.fileName.includes("VOX_num_0~20")) {
      return { source: resolveAudioSource("VO_num_0.mp3"), playFile: "VO_num_0.mp3" };
    }
    if (row.id === "44-T" || row.fileName.includes("VOX_num_30~90")) {
      return { source: resolveAudioSource("VO_num_30.mp3"), playFile: "VO_num_30.mp3" };
    }
    if (row.id === "44-OP" || row.fileName.includes("VOX_op_plus")) {
      return { source: resolveAudioSource("VO_op_plus.mp3"), playFile: "VO_op_plus.mp3" };
    }
    return { source: resolveAudioSource(row.fileName), playFile: row.fileName };
  }

  function inferAudioCategory(fileName) {
    if (/^VO/i.test(fileName) || /^VOX_/i.test(fileName) || /^SFX_music_note/i.test(fileName) || /^SFX_mode_switch/i.test(fileName) || /^SFX_music_(enter|exit|page)/i.test(fileName)) {
      return "content";
    }
    return "noncontent";
  }

  function inferAudioPriority(fileName) {
    if (/^SFX_(boot|sleep|timeout|mode_switch|music_enter|music_exit|music_page)/i.test(fileName)) {
      return 4;
    }
    if (/^SFX_(correct|wrong|star_|round_complete|game_win|game_lose)/i.test(fileName)) {
      return 3;
    }
    if (/^VO/i.test(fileName) || /^VOX_/i.test(fileName) || /^SFX_music_note/i.test(fileName) || /^VO_table99/i.test(fileName)) {
      return 2;
    }
    return 1;
  }

  function render() {
    renderPower();
    renderFace();
    renderStatusRow();
    renderMainDisplay();
    renderInfoCards();
    renderLog();
    renderAudioTable();
  }

  function renderPower() {
    els.volumeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.volume === state.volume);
    });

    els.toyShell.classList.toggle("is-off", !state.powered);
    els.lcdScreen.classList.toggle("is-off", !state.powered);
    els.sleepMask.classList.toggle("is-visible", state.sleeping);
  }

  function renderFace() {
    els.faceRow.className = `face-row mood-${state.faceMood}${state.faceEnabled ? "" : " is-hidden"}`;
  }

  function renderStatusRow() {
    const showTimer = state.powered && !state.sleeping && ["math", "compare"].includes(state.modeGroup) && state.timerSetting > 0;
    const timerText = state.timerExpired ? "00" : String(state.timerRemaining || state.timerSetting || "").padStart(2, "0");
    els.timerSlot.classList.toggle("is-visible", showTimer);
    els.timerSlot.classList.toggle("is-blinking", showTimer && state.timerRemaining > 0 && state.timerRemaining <= 3);
    els.timerValue.textContent = timerText || "--";

    const showMusic = state.modeGroup === "music";
    els.musicSlot.classList.toggle("is-visible", showMusic);
    const showGame = state.modeGroup === "game";
    els.gameSlot.classList.toggle("is-visible", showGame);

    const progressText = computeProgressText();
    els.progressSlot.classList.toggle("is-visible", Boolean(progressText));
    els.progressValue.textContent = progressText;
  }

  function renderMainDisplay() {
    const model = displayModel();
    els.digitCells.forEach((cell) => {
      const key = cell.dataset.cell;
      const data = model[key] || { char: "", blink: false, cursor: false };
      setDigitCell(cell, data.char, data);
    });

    els.operatorCells.forEach((cell) => {
      const key = cell.dataset.cell;
      const value = model[key] || " ";
      const glyph = cell.querySelector(".operator-glyph");
      glyph.textContent = value;
      cell.classList.toggle("is-hidden", !value || value === " ");
    });
  }

  function displayModel() {
    const blank = {
      D1: { char: "" },
      D2: { char: "" },
      OP1: " ",
      D3: { char: "" },
      D4: { char: "" },
      OP2: " ",
      D5: { char: "" },
      D6: { char: "" },
      D7: { char: "" },
    };

    if (!state.powered || state.sleeping) {
      return blank;
    }

    if (state.modeGroup === "math" || state.modeGroup === "compare") {
      const question = state.question;
      const left = toDigitTriplet(question.left, 2);
      const right = toDigitTriplet(question.right, 2);
      blank.D1 = { char: left[0] };
      blank.D2 = { char: left[1] };
      blank.OP1 = question.operator;
      blank.D3 = { char: right[0] };
      blank.D4 = { char: right[1] };

      if (state.modeGroup === "compare") {
        const target = toDigitTriplet(question.compareTarget, 3);
        blank.OP2 = state.compareSelection || " ";
        blank.D5 = { char: target[0] };
        blank.D6 = { char: target[1] };
        blank.D7 = { char: target[2] };
      } else {
        blank.OP2 = "=";
        const answerValue = state.input || "";
        const chars = toInputTriplet(answerValue);
        blank.D5 = { char: chars[0], blink: state.awaitingAdvance === "mathWrong" };
        blank.D6 = { char: chars[1], blink: state.awaitingAdvance === "mathWrong" };
        blank.D7 = { char: chars[2], blink: state.awaitingAdvance === "mathWrong" };
      }
      return blank;
    }

    if (state.modeGroup === "table99") {
      const item = TABLE_99_SEQUENCE[state.table99Index];
      const left = toDigitTriplet(item.a, 2);
      const right = toDigitTriplet(item.b, 2);
      const result = toDigitTriplet(item.result, 3);
      return {
        D1: { char: left[0] },
        D2: { char: left[1] },
        OP1: "×",
        D3: { char: right[0] },
        D4: { char: right[1] },
        OP2: "=",
        D5: { char: result[0] },
        D6: { char: result[1] },
        D7: { char: result[2] },
      };
    }

    if (state.modeGroup === "music") {
      const page = currentSong().pages[state.musicPageIndex] || "";
      const chars = page.padEnd(7, " ").slice(0, 7).split("");
      return {
        D1: musicDisplayChar(chars[0], 0),
        D2: musicDisplayChar(chars[1], 1),
        OP1: " ",
        D3: musicDisplayChar(chars[2], 2),
        D4: musicDisplayChar(chars[3], 3),
        OP2: " ",
        D5: musicDisplayChar(chars[4], 4),
        D6: musicDisplayChar(chars[5], 5),
        D7: musicDisplayChar(chars[6], 6),
      };
    }

    if (state.modeGroup === "game") {
      if (state.gameSubmode === "memory") {
        return memoryDisplayModel();
      }
      if (state.gameSubmode === "extreme") {
        return extremeDisplayModel();
      }
      if (state.gameSubmode === "pattern") {
        return patternDisplayModel();
      }
      if (state.gameSubmode === "guess") {
        const guess = toInputTriplet(state.input || state.question.lastGuess || "");
        let op2 = " ";
        if (state.awaitingAdvance === "guessLose") {
          const answer = toDigitTriplet(state.question.answer, 3);
          return {
            ...blank,
            OP2: " ",
            D5: { char: answer[0], blink: true },
            D6: { char: answer[1], blink: true },
            D7: { char: answer[2], blink: true },
          };
        }
        if (state.lastGuessFeedback === "tooHigh") {
          op2 = "<";
        } else if (state.lastGuessFeedback === "tooLow") {
          op2 = ">";
        }
        return {
          ...blank,
          OP2: op2,
          D5: { char: guess[0] },
          D6: { char: guess[1] },
          D7: { char: guess[2] || (!state.input ? "_" : ""), cursor: !state.input },
        };
      }
    }

    return blank;
  }

  function memoryDisplayModel() {
    if (state.question.stage === "memorize") {
      const sequence = state.question.sequence.join("").padEnd(7, " ").slice(0, 7).split("");
      return {
        D1: { char: sequence[0], blink: true },
        D2: { char: sequence[1], blink: true },
        OP1: " ",
        D3: { char: sequence[2], blink: true },
        D4: { char: sequence[3], blink: true },
        OP2: " ",
        D5: { char: sequence[4], blink: true },
        D6: { char: sequence[5], blink: true },
        D7: { char: sequence[6], blink: true },
      };
    }

    const chars = toSlotArray(state.input, 7);
    return {
      D1: { char: chars[0] },
      D2: { char: chars[1] },
      OP1: " ",
      D3: { char: chars[2] },
      D4: { char: chars[3] },
      OP2: " ",
      D5: { char: chars[4] },
      D6: { char: chars[5] },
      D7: { char: chars[6] || "_", cursor: state.input.length < state.question.sequence.length },
    };
  }

  function extremeDisplayModel() {
    const [first, second, third] = state.question.numbers.map((value) => String(value));
    return {
      D1: { char: first.length > 1 ? first[0] : "" },
      D2: { char: first.slice(-1) },
      OP1: " ",
      D3: { char: second.length > 1 ? second[0] : "" },
      D4: { char: second.slice(-1) },
      OP2: " ",
      D5: { char: third.length > 1 ? third[0] : "" },
      D6: { char: third.length > 1 ? third[1] : "" },
      D7: { char: third.length > 1 ? "" : third },
    };
  }

  function patternDisplayModel() {
    const slots = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
    const model = {
      D1: { char: "" },
      D2: { char: "" },
      OP1: " ",
      D3: { char: "" },
      D4: { char: "" },
      OP2: " ",
      D5: { char: "" },
      D6: { char: "" },
      D7: { char: "" },
    };

    state.question.sequence.slice(0, 6).forEach((digit, index) => {
      model[slots[index]] = { char: String(digit) };
    });

    const answerIndex = Math.min(state.question.sequence.length, slots.length - 1);
    model[slots[answerIndex]] = state.input ? { char: state.input } : { char: "_", cursor: true };
    return model;
  }

  function musicDisplayChar(char, index) {
    if (!char || char === " ") {
      return { char: "" };
    }
    if (char === "0") {
      return { char: "" };
    }
    return {
      char,
      blink: index >= state.musicSolvedCount,
    };
  }

  function setDigitCell(cell, char, meta = {}) {
    const normalized = char ? String(char).trim() : "";
    cell.classList.toggle("is-hidden", !normalized);
    cell.classList.toggle("is-blinking", Boolean(meta.blink));
    cell.classList.toggle("is-cursor", Boolean(meta.cursor));
    cell.querySelectorAll(".seg").forEach((segment) => {
      segment.classList.remove("is-on");
    });
    if (!normalized || !SEGMENT_MAP[normalized]) {
      return;
    }
    SEGMENT_MAP[normalized].forEach((segmentName) => {
      const el = cell.querySelector(`.seg-${segmentName}`);
      if (el) {
        el.classList.add("is-on");
      }
    });
  }

  function computeProgressText() {
    if (!state.powered || state.sleeping) {
      return "";
    }
    if (state.modeGroup === "music") {
      return `${state.musicPageIndex + 1}/${currentSong().pages.length}`;
    }
    if (state.modeGroup === "table99") {
      return "";
    }
    if (state.modeGroup === "game" && state.gameSubmode === "guess") {
      return `${state.guessAttemptsLeft}/10`;
    }
    if (state.modeGroup === "game" && state.gameSubmode === "extreme" && state.question?.requiresSubmit && state.input) {
      return `${state.progress}/10 ${state.input.padEnd(state.question.answerDigits, "_")}`;
    }
    if (state.modeGroup === "game") {
      return `${state.progress}/10`;
    }
    if (state.modeGroup === "math" || state.modeGroup === "compare") {
      return `${state.progress}/50`;
    }
    return "";
  }

  function renderInfoCards() {
    els.modeTitle.textContent = titleForState();
    els.modeSubtitle.textContent = subtitleForState();
    els.ruleHint.textContent = ruleHintForState();
    if (!runtime.currentAudioName) {
      updateAudioHint(runtime.importedAudio.size ? `已有 ${runtime.importedAudio.size} 个导入文件覆盖默认资源。` : "当前使用仓库默认音频，可随时导入替换。");
    }
  }

  function updateAudioHint(text) {
    els.audioHint.textContent = text;
  }

  function titleForState() {
    if (!state.powered) return "等待开机";
    if (state.sleeping) return "休眠中";
    if (state.modeGroup === "math") return modeLabel(state.currentMathMode);
    if (state.modeGroup === "compare") return `${modeLabel(state.currentMathMode)} 比大小`;
    if (state.modeGroup === "table99") return "九九乘法表";
    if (state.modeGroup === "music") return `音乐模式 · ${currentSong().label}`;
    return `游戏模式 · ${gameLabel(state.gameSubmode)}`;
  }

  function subtitleForState() {
    if (!state.powered) return "拨动右上角 OFF / 静音 / 低 / 高 来模拟实体拨杆。";
    if (state.sleeping) return "休眠状态下按任意键唤醒，唤醒不触发任何提示音。";
    if (state.modeGroup === "compare") return "先按 < / > / = 选择关系，再按 OK 确认。";
    if (state.modeGroup === "music") return "数字键只播放音符，< > 手动翻页带提示音，OK 回到第一页，长按⏱退出。";
    if (state.modeGroup === "game" && state.gameSubmode === "extreme") return "一位数题直接按答案数字；两位数题输入完整答案后按 OK。";
    if (state.modeGroup === "game" && state.gameSubmode === "pattern") return "观察前面的短序列，在下一空位补 1 个数字后按 OK。";
    if (state.modeGroup === "game" && state.gameSubmode === "guess") return "输入 1-100 的猜测值，OP2 会反馈 < 或 >。";
    if (state.modeGroup === "game") return "★ 短按会在记忆 / 找最大小 / 猜规律 / 猜数字之间循环。";
    return "长按模式键进比大小，长按⏱进入隐藏音乐模式，长按★切表情开关。";
  }

  function ruleHintForState() {
    if (!state.powered) return "关机会保存当前题目、进度和倒计时档位；冷启动按钮会清空缓存。";
    if (state.modeGroup === "music") return "音乐模式自动翻页静默，手动翻页播放 SFX_music_page，按错音符不会重置当前页进度。";
    if (state.modeGroup === "game" && state.gameSubmode === "memory") return "先按对第一个数字，其余数字立即消失，然后凭记忆完整输入。";
    if (state.modeGroup === "game" && state.gameSubmode === "extreme") return "出题梯度改成参考模拟器：先 1-3 / 4-6 / 7-9，再随机一位数，最后进入两位数题。";
    if (state.modeGroup === "game" && state.gameSubmode === "pattern") return `当前题型：${state.question?.label || "规律题"}，序列长度按参考模拟器收成 3-4 位，答案填在下一空位。`;
    if (state.modeGroup === "game" && state.gameSubmode === "guess") return "开始输入新猜测时，会立即清掉上一轮的 < / > 反馈。";
    if (state.modeGroup === "compare") return "等于题比例限制在 20% 左右，切模式会清空当前进度。";
    return "倒计时只在计算 / 比大小模式可见；进入游戏或音乐模式会自动停止并隐藏。";
  }

  function renderLog() {
    els.eventLog.innerHTML = "";
    state.eventLog.slice(0, 8).forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      els.eventLog.appendChild(item);
    });
  }

  function logEvent(message) {
    state.eventLog.unshift(message);
    state.eventLog = state.eventLog.slice(0, 8);
    renderLog();
  }

  function currentSong() {
    return MUSIC_SONGS.find((song) => song.key === state.musicSongKey) || MUSIC_SONGS[0];
  }

  function modeLabel(mode) {
    return {
      singleAddSub: "一位数加减",
      doubleAddSub: "两位数加减",
      multiply: "乘法",
      divide: "除法",
    }[mode];
  }

  function gameLabel(mode) {
    return {
      memory: "记忆模式",
      extreme: "找最大 / 最小",
      pattern: "猜规律",
      guess: "猜数字",
    }[mode];
  }

  function volumeLabel(volume) {
    return {
      high: "高音量",
      low: "低音量",
      mute: "静音",
      off: "关机",
    }[volume];
  }

  function toDigitTriplet(value, width) {
    const text = String(value).padStart(width, " ");
    if (width === 2) {
      return [text[0] === " " ? "" : text[0], text[1]];
    }
    return text.padStart(3, " ").slice(-3).split("").map((char) => (char === " " ? "" : char));
  }

  function toInputTriplet(value) {
    return String(value).padStart(3, " ").slice(-3).split("").map((char) => (char === " " ? "" : char));
  }

  function toSlotArray(value, count) {
    return String(value)
      .padEnd(count, " ")
      .slice(0, count)
      .split("")
      .map((char) => (char === " " ? "" : char));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomPick(items, weights) {
    if (!weights) {
      return items[randomInt(0, items.length - 1)];
    }
    const total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    for (let index = 0; index < items.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return items[index];
    }
    return items[items.length - 1];
  }

  function shuffle(items) {
    const list = [...items];
    for (let index = list.length - 1; index > 0; index -= 1) {
      const swap = randomInt(0, index);
      [list[index], list[swap]] = [list[swap], list[index]];
    }
    return list;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cancelSleepMask() {
    els.sleepMask.classList.remove("is-visible");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
})();
