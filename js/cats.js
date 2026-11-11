/* Hand-drawn cats, made of plain SVG so they stay sharp and can move.
   "her" = cream cat with a pink bow, "him" = ginger cat with stripes. */
(function () {
  'use strict';
  const OUT = '#3B2A2C';
  const LOOKS = {
    her: { fur: '#FFF3E4', belly: '#FFFFFF', ear: '#F6B0C0', stripe: '', bow: true },
    him: { fur: '#F4A259', belly: '#FFE0BC', ear: '#F6B0C0', stripe: '#D5762A', bow: false },
  };
  const delay = () => `style="animation-delay:-${(Math.random() * 4).toFixed(2)}s"`;
  const st = (w) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  function cat(opts = {}) {
    const o = Object.assign({ who: 'her', eyes: 'open', mouth: 'w', cls: '' }, opts);
    const L = Object.assign({}, LOOKS[o.who]);

    let mane = '';
    if (o.mane) {
      let petals = '';
      for (let i = 0; i < 16; i++) {
        petals += `<ellipse cx="100" cy="34" rx="15" ry="24" transform="rotate(${i * 22.5} 100 84)" fill="${i % 2 ? '#E08A2E' : '#EFA94A'}" ${st(2.5)}/>`;
      }
      mane = `<g class="mane">${petals}</g>`;
    }

    const stripesHead = L.stripe
      ? `<g fill="none" stroke="${L.stripe}" stroke-width="4.5" stroke-linecap="round"><path d="M91 49 Q93 56 91.5 62"/><path d="M100 46.5 V60"/><path d="M109 49 Q107 56 108.5 62"/><path d="M54 84 L65 86.5"/><path d="M55 92 L65 92.5"/><path d="M146 84 L135 86.5"/><path d="M145 92 L135 92.5"/></g>`
      : '';
    const stripesBody = L.stripe
      ? `<g fill="none" stroke="${L.stripe}" stroke-width="4.5" stroke-linecap="round"><path d="M67 140 Q73 142 75 148"/><path d="M133 140 Q127 142 125 148"/><path d="M64 156 Q70 157 72 163"/><path d="M136 156 Q130 157 128 163"/></g>`
      : '';

    let eyes;
    if (o.glasses) {
      eyes = `<g class="shades"><path d="M63 79 H92 V87 Q92 97 82 97 H73 Q63 97 63 87 Z" fill="#22202E" ${st(2.5)}/><path d="M108 79 H137 V87 Q137 97 127 97 H118 Q108 97 108 87 Z" fill="#22202E" ${st(2.5)}/><path d="M92 82 Q100 78 108 82" fill="none" ${st(3)}/><path d="M68 83.5 L76 83.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/><path d="M113 83.5 L121 83.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/></g>`;
    } else {
      eyes =
        `<g class="eyes-open" ${delay()}><ellipse cx="80" cy="86" rx="6.2" ry="7.6" fill="${OUT}"/><ellipse cx="120" cy="86" rx="6.2" ry="7.6" fill="${OUT}"/><circle cx="82.3" cy="83.2" r="2.4" fill="#fff"/><circle cx="122.3" cy="83.2" r="2.4" fill="#fff"/></g>` +
        `<g class="eyes-happy" fill="none" stroke="${OUT}" stroke-width="3.6" stroke-linecap="round"><path d="M72.5 89 Q80 79.5 87.5 89"/><path d="M112.5 89 Q120 79.5 127.5 89"/></g>` +
        `<g class="eyes-closed" fill="none" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round"><path d="M72.5 85 Q80 92 87.5 85"/><path d="M112.5 85 Q120 92 127.5 85"/></g>`;
    }

    let brows = '';
    if (o.brows) brows = `<g fill="none" ${st(3.2)}><path d="M70 72.5 L88 77.5"/><path d="M130 72.5 L112 77.5"/></g>`;
    if (o.brow) brows = `<g fill="none" ${st(3.2)}><path d="M112 72 Q121 66 131 70.5"/></g>`;

    const mouths = {
      w: `<path d="M100 101.5 V104 M92.5 103.5 Q96.3 108.5 100 104 Q103.7 108.5 107.5 103.5" fill="none" ${st(2.6)}/>`,
      o: `<path d="M100 101.5 V103"  fill="none" ${st(2.4)}/><ellipse cx="100" cy="109" rx="4.8" ry="6" fill="#8E3446" ${st(2.2)}/>`,
      smile: `<path d="M91 103.5 Q100 113 109 103.5" fill="none" ${st(2.8)}/>`,
      smirk: `<path d="M93 105 Q102 110 110 101.5" fill="none" ${st(2.8)}/>`,
    };

    const bow = L.bow && !o.noBow
      ? `<g transform="translate(124 50) rotate(18)"><path d="M0 0 L-15 -10 Q-19 0 -15 10 Z" fill="#E36F8C" ${st(2.2)}/><path d="M0 0 L15 -10 Q19 0 15 10 Z" fill="#E36F8C" ${st(2.2)}/><circle r="4.6" fill="#C24F6F" ${st(2.2)}/></g>`
      : '';

    const tail = 'M136 176 C 170 172 182 146 171 122 C 165 109 175 99 183 105';
    const bodyPart = o.head ? '' :
      `<g class="tail" ${delay()}><path d="${tail}" fill="none" stroke="${OUT}" stroke-width="17" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="${L.fur}" stroke-width="11" stroke-linecap="round"/></g>` +
      `<g class="body"><path d="M62 183 C 55 142 72 113 100 113 C 128 113 145 142 138 183 Q 100 191 62 183 Z" fill="${L.fur}" ${st(3)}/><ellipse cx="100" cy="158" rx="19" ry="21" fill="${L.belly}"/>${stripesBody}<ellipse cx="86" cy="184" rx="12.5" ry="8" fill="${L.fur}" ${st(3)}/><ellipse cx="114" cy="184" rx="12.5" ry="8" fill="${L.fur}" ${st(3)}/></g>`;

    const state = o.eyes === 'happy' ? 'is-happy' : o.eyes === 'closed' ? 'is-closed' : '';
    const vb = o.head ? '38 18 124 112' : '0 0 200 200';
    return `<svg class="cat ${state} ${o.cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${bodyPart}
      <g class="head" ${delay()}>${mane}
        <path d="M57 76 L 59 30 L 93 54 Z" fill="${L.fur}" ${st(3)}/><path d="M64 66 L 65.5 42 L 84 56 Z" fill="${L.ear}"/>
        <path d="M143 76 L 141 30 L 107 54 Z" fill="${L.fur}" ${st(3)}/><path d="M136 66 L 134.5 42 L 116 56 Z" fill="${L.ear}"/>
        <ellipse cx="100" cy="85" rx="48" ry="40" fill="${L.fur}" ${st(3)}/>${stripesHead}
        <ellipse class="cheek" cx="68" cy="99" rx="9" ry="5.5" fill="#F68AA3"/><ellipse class="cheek" cx="132" cy="99" rx="9" ry="5.5" fill="#F68AA3"/>
        ${eyes}${brows}
        <path d="M95.5 96 L104.5 96 L100 101.5 Z" fill="#E8738A" ${st(1.6)}/>
        ${mouths[o.mouth] || mouths.w}
        <g stroke="${OUT}" stroke-width="2" stroke-linecap="round" opacity=".55"><path d="M55 100 L38 97"/><path d="M55 106 L39 108"/><path d="M145 100 L162 97"/><path d="M145 106 L161 108"/></g>
        ${bow}
      </g></svg>`;
  }

  /* A cat seen from behind, for the rooftop under the moon. */
  function back(o = {}) {
    const N = '#1E1834';
    const isHim = o.who === 'him';
    const fur = isHim ? '#C9803F' : '#E8DCCD';
    const tail = 'M84 162 C 112 160 120 130 106 113 C 99 105 105 95 114 100';
    const stripes = isHim
      ? `<g stroke="#9E5A22" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M52 46 Q54 54 52 60"/><path d="M60 44 V58"/><path d="M68 46 Q66 54 68 60"/><path d="M44 118 Q50 120 52 126"/><path d="M76 118 Q70 120 68 126"/><path d="M42 136 Q48 137 50 143"/><path d="M78 136 Q72 137 70 143"/></g>`
      : '';
    const bow = isHim ? '' :
      `<g transform="translate(76 47) rotate(20)"><path d="M0 0 L-11 -7 Q-14 0 -11 7 Z" fill="#E36F8C" stroke="${N}" stroke-width="1.8"/><path d="M0 0 L11 -7 Q14 0 11 7 Z" fill="#E36F8C" stroke="${N}" stroke-width="1.8"/><circle r="3.4" fill="#C24F6F" stroke="${N}" stroke-width="1.8"/></g>`;
    const body =
      `<g class="tail"><path d="${tail}" fill="none" stroke="${N}" stroke-width="13" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="${fur}" stroke-width="7.5" stroke-linecap="round"/></g>` +
      `<path d="M31 165 C 25 120 42 94 60 94 C 78 94 95 120 89 165 Q 60 171 31 165 Z" fill="${fur}" stroke="${N}" stroke-width="2.6"/>` +
      `<path d="M37 62 L 39 27 L 58 45 Z" fill="${fur}" stroke="${N}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M83 62 L 81 27 L 62 45 Z" fill="${fur}" stroke="${N}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<g class="bhead"><circle cx="60" cy="69" r="29" fill="${fur}" stroke="${N}" stroke-width="2.6"/>${stripes}${bow}</g>`;
    const rim = '<path d="M73 45 A 29 29 0 0 1 88 74" fill="none" stroke="rgba(255,240,200,.6)" stroke-width="2.4" stroke-linecap="round"/>';
    return (o.mirror ? `<g transform="translate(120 0) scale(-1 1)">${body}</g>` : body) + rim;
  }

  /* The night scene: skyline, rooftop, two cats and the heart between them. */
  function roof() {
    const blocks = [[-10, 150, 52], [40, 128, 40], [78, 160, 34], [110, 118, 46], [154, 146, 30], [182, 108, 42], [222, 150, 36], [256, 124, 44], [298, 156, 32], [328, 116, 40], [366, 140, 40]];
    let sky = '';
    for (const [x, y, w] of blocks) {
      sky += `<rect x="${x}" y="${y}" width="${w}" height="${206 - y}" fill="#1A1736"/>`;
      for (let wy = y + 10; wy < 192; wy += 14) {
        for (let wx = x + 6; wx < x + w - 6; wx += 10) {
          if (Math.random() < 0.28) sky += `<rect class="win" x="${wx}" y="${wy}" width="4" height="6" rx="1" fill="#FFD98A" style="animation-delay:-${(Math.random() * 9).toFixed(1)}s"/>`;
        }
      }
    }
    let tiles = '';
    for (let y = 214; y < 262; y += 12) tiles += `<path d="M-20 ${y} L410 ${y}" />`;
    const heart = 'M195 150 C 180 138 172 128 172 118 C 172 110 178 105 185 105 C 190 105 193 108 195 112 C 197 108 200 105 205 105 C 212 105 218 110 218 118 C 218 128 210 138 195 150 Z';
    return `<svg viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="rglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="roofg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1631"/><stop offset="1" stop-color="#0C0A1C"/></linearGradient>
      </defs>
      <g class="skyline">${sky}</g>
      <path d="M-20 200 L410 200 L410 270 L-20 270 Z" fill="url(#roofg)"/>
      <g stroke="rgba(255,255,255,.035)" stroke-width="1.5">${tiles}</g>
      <path d="M-20 200 L410 200" stroke="rgba(255,236,190,.22)" stroke-width="2"/>
      <g class="rc-heart"><g class="rc-heart-in"><path d="${heart}" fill="#FF7F9F" filter="url(#rglow)"/></g></g>
      <g id="rc-me" class="rc"><svg x="126" y="116" width="62" height="88" viewBox="0 0 120 172">${back({ who: 'him' })}</svg></g>
      <g id="rc-her" class="rc"><svg x="202" y="116" width="62" height="88" viewBox="0 0 120 172">${back({ who: 'her', mirror: true })}</svg></g>
    </svg>`;
  }

  function paw(fill = '#fff') {
    return `<svg class="paw" viewBox="0 0 100 100" aria-hidden="true"><g fill="${fill}"><path d="M50 90 C 31 90 22 78 27 67 C 32 57 42 56 50 56 C 58 56 68 57 73 67 C 78 78 69 90 50 90 Z"/><ellipse cx="22" cy="44" rx="9" ry="11.5" transform="rotate(-22 22 44)"/><ellipse cx="39" cy="27" rx="9.5" ry="12.5" transform="rotate(-6 39 27)"/><ellipse cx="61" cy="27" rx="9.5" ry="12.5" transform="rotate(6 61 27)"/><ellipse cx="78" cy="44" rx="9" ry="11.5" transform="rotate(22 78 44)"/></g></svg>`;
  }

  /* A furry arm with toe beans, for the high-five. */
  function arm(fur) {
    return `<svg viewBox="0 0 100 150" aria-hidden="true"><path d="M24 152 V80 C24 41 76 41 76 80 V152 Z" fill="${fur}" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/><g fill="#F6A3B6"><ellipse cx="50" cy="86" rx="12" ry="9"/><circle cx="35" cy="68" r="5.5"/><circle cx="45.5" cy="61" r="5.5"/><circle cx="54.5" cy="61" r="5.5"/><circle cx="65" cy="68" r="5.5"/></g></svg>`;
  }

  window.Cat = { cat, back, roof, paw, arm };
})();
