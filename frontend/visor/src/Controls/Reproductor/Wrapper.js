import './style.css'
function translateDay(day) {
  const days = {
    'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mié',
    'Thu': 'Jue', 'Fri': 'Vie', 'Sat': 'Sáb',
    'Sun': 'Dom',
  };
  return days[day] || day;
}

function spanishDayNameByNumber(dayNumber) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[dayNumber] || '';
}

function spanishMonthNameByNumber(monthNumber) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return months[monthNumber] || '';
}

function reproductorGenerator(context, state) {
  
  const spanInput = document.createElement('span');
  Object.assign(spanInput.style, {
      position: 'absolute',
      left: '0%',
      top: '-30px',
      // transform: 'translateX(-50%)',
      textAlign: 'center',
      userSelect: 'none',
      background: 'rgba(255, 255, 255)',
      position: 'absolute',
      paddingLeft: '5px',
      paddingRight: '5px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      border: '1.5px solid rgb(118, 118, 118)',
  });

  function frame_adjust(dt){
    // 23 para dt=15. Ajustar según dt cambie linealmente
    return Math.min(Math.floor(23 * 15 / dt), 59);
  }

  // Variables to adjust the frame rate
  let dt = context.ref_dt;
  let framepersecond  = frame_adjust(dt); // frames per second

  function SetInputRangeLabel(frame) {
      let date = new Date(state.instance.replace("_", " ") + ":00:00Z");
      date.setUTCMinutes(frame*dt);
      if (context.optionLocalTime) {
          const localOffset = date.getTimezoneOffset();
          date.setMinutes(date.getMinutes() - localOffset);
      }
      
      let dayWeek = spanishDayNameByNumber(date.getUTCDay())
      let dayNum  = String(date.getUTCDate()).padStart(2, '0');
      let month   = spanishMonthNameByNumber(date.getUTCMonth())      
      let year    = date.getUTCFullYear();
      let hours   = String(date.getUTCHours()).padStart(2, '0');
      let minutes = String(date.getUTCMinutes()).padStart(2, '0');

      spanInput.textContent = context.optionLocalTime == true
        ? `${dayWeek}, ${dayNum} ${month} ${year} ${hours}:${minutes}`
        : `${dayWeek}, ${dayNum} ${month} ${year} ${hours}:${minutes} UTC`;
  }

  const inputFrame = document.createElement('input');
  inputFrame.title="Selector de tiempo"
  inputFrame.id = 'time-selector';
  inputFrame.type  = 'range';
  inputFrame.step  = 1;
  inputFrame.min   = Math.floor(context.startHour * 60 / dt);
  inputFrame.max   = Math.floor(context.endHour   * 60 / dt);
  inputFrame.value = inputFrame.min
  Object.assign(inputFrame.style, {
      width: '100%',
      height: '100%',
      userSelect: 'none',
      cursor: 'pointer',
  });
  inputFrame.style.WebkitAppearance = 'none';
  inputFrame.style.background = 'silver'
  inputFrame.style.borderRadius = '5px';
  inputFrame.style.height = '80%';

  // Sincronizacion de input label y state.frame
  SetInputRangeLabel(inputFrame.min);
  state.frame = inputFrame.min;
  inputFrame.addEventListener('change', (event) => {
      const frame = event.target.value;
      state.frame = frame;
      SetInputRangeLabel(frame);
  });
  inputFrame.addEventListener('input', (event) => {
      const frame = event.target.value;
      state.frame = frame;
      SetInputRangeLabel(frame);
  });
  state.addEventListener('change:instance', () => {
    SetInputRangeLabel(state.frame);
  });

  //// Animacion
  let framesPerUpdate = Math.floor(1000 / framepersecond / 16.67); 
  let frameCount = 0;
  let animationId = null;
  
  function animateRange() {
    frameCount++;
    if (frameCount % framesPerUpdate === 0) {
      let currentValue = parseInt(inputFrame.value);
      if (currentValue < parseInt(inputFrame.max)) {
        inputFrame.value = currentValue + 1;
        inputFrame.dispatchEvent(new Event('change'));
      } else {
        cancelAnimationFrame(animationId);
        buttonPause.click();
        animationId = null;
        return;
      }
    }
    animationId = requestAnimationFrame(animateRange);
  }

  //// Botones
  const styleButton = {
      width: '18px',
      fontSize: '18px',
      userSelect: 'none',
      cursor: 'pointer',
  }
  const buttonPlay = document.createElement('i');
  buttonPlay.classList.add('bi', 'bi-play');
  Object.assign(buttonPlay.style, styleButton);
  buttonPlay.addEventListener('click', () => {
    if (!animationId) {
      animationId = requestAnimationFrame(animateRange);
    }
  });
  const buttonPause = document.createElement('i');
  buttonPause.classList.add('bi', 'bi-pause');
  Object.assign(buttonPause.style, styleButton);
  buttonPause.addEventListener('click', () => {
      if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
      }
  });
  const buttonNext = document.createElement('i');
  buttonNext.classList.add('bi', 'bi-plus', 'icon-black');
  Object.assign(buttonNext.style, styleButton);
  buttonNext.addEventListener('click', () => {
      buttonPause.click();
      let currentValue = parseInt(inputFrame.value);
      if (currentValue < parseInt(inputFrame.max)) {
        inputFrame.value = currentValue + 1;
        inputFrame.dispatchEvent(new Event('change'));
      }
  });
  const buttonPrev = document.createElement('i');
  buttonPrev.classList.add('bi', 'bi-dash', 'icon-black');
  Object.assign(buttonPrev.style, styleButton);
  buttonPrev.addEventListener('click', () => {
      buttonPause.click();
      let currentValue = parseInt(inputFrame.value);
      if (currentValue > 0) {
        inputFrame.value = currentValue - 1;
        inputFrame.dispatchEvent(new Event('change'));
      }
  });

  //// Nivel de altura
  const labelLevel = document.createElement('label');
  labelLevel.htmlFor = 'level-selector';
  labelLevel.textContent = 'Nivel:';
  Object.assign(labelLevel.style, {
      width: '50px',
      userSelect: 'none',
      cursor: 'pointer',
      textAlign: 'center',
  });
  const inputLevel = document.createElement('input');
  inputLevel.id    = 'level-selector';
  inputLevel.type  = 'number';
  inputLevel.min   = '0';
  inputLevel.step  = '1';
  inputLevel.value = state.level;
  inputLevel.max   = context.levels;
  Object.assign(inputLevel.style, {
      width: '50px',
      height: '100%',
      userSelect: 'none',
      cursor: 'pointer',
      textAlign: 'center',
  });
  //Desactivar focus
  inputLevel.addEventListener('focus', (event) => {
      event.target.blur();
  });
  inputLevel.addEventListener('change', (event) => {
      const level = parseInt(event.target.value);
      state.level = level;
  });

  //// Contenedor del reproductor
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
      position: 'relative',
      height: '25px',
      display: 'flex',
      flexDirection: 'row',
      gap: '2px',
      alignItems: 'center',
      padding: '2px',
      background: 'rgba(255, 255, 255)',
      borderRadius: '5px',
      border: '1.5px solid rgb(118, 118, 118)',
      userSelect: 'none',
  });
  wrapper.appendChild(buttonPlay);
  wrapper.appendChild(buttonPause);
  wrapper.appendChild(buttonPrev);
  wrapper.appendChild(buttonNext);
  wrapper.appendChild(inputFrame);
  // wrapper.appendChild(labelLevel);
  // wrapper.appendChild(inputLevel);
  wrapper.appendChild(spanInput);

  // Alternar la visivilidad de los botones play and pause
  buttonPlay.style.display  = 'inline';
  buttonPause.style.display = 'none';
  buttonPlay.addEventListener('click', () => {
    buttonPlay.style.display  = 'none';
    buttonPause.style.display = 'inline';
  });
  buttonPause.addEventListener('click', () => {
    buttonPlay.style.display  = 'inline';
    buttonPause.style.display = 'none';
  });

  // Update inputRange according currentData
  state.addEventListener('change:currentData', () => {
      const current_dt   = dt 
      const new_dt       = state.currentData?.attrs.dt || context.ref_dt;
      if (current_dt != new_dt) {
        // Update Value
        const inputMaxNew  = Math.floor(context.endHour * 60 / new_dt);
        const inputMaxOld  = Math.floor(context.endHour * 60 / current_dt);

        const inputMinOld  = Math.floor(context.startHour * 60 / current_dt);
        const inputMinNew  = Math.floor(context.startHour * 60 / new_dt);

        const currentSelectedFrame   = inputFrame.value;
        const percentageCurrentFrame = (currentSelectedFrame-inputMinOld)/(inputMaxOld-inputMinOld);
        const newValue = Math.round(percentageCurrentFrame * (inputMaxNew-inputMinNew) + inputMinNew);
        inputFrame.min   = inputMinNew;
        inputFrame.max   = inputMaxNew;
        inputFrame.value = newValue;
        dt = new_dt;
        framesPerUpdate = Math.floor(1000 / frame_adjust(dt)/ 16.67);
        inputFrame.dispatchEvent(new Event('change'));
      }
  });


  // Generamos una pausa cuando se inicia la carga de datos
  let pauseLoad = false;
  document.addEventListener('loading:start', () => {
    if (animationId) {
      buttonPause.click();
      pauseLoad = true;
    }
  });
  document.addEventListener('loading:end', () => {
    if (pauseLoad) {
      pauseLoad = false;
      buttonPlay.click();
    }
  });

  document.addEventListener('domainChanged:start', () => {
    if (animationId) {
      buttonPause.click();
      pauseLoad = true;
    }
  });
  document.addEventListener('domainChanged:end', () => {
    if (pauseLoad) {
      pauseLoad = false;
      buttonPlay.click();
    }
  });  

  return wrapper;
}


export { reproductorGenerator };