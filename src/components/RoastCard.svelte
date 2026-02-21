<script lang="ts">
  import {toPng} from 'html-to-image';

  let {result, mode = 'roast'} = $props();

  function getDiagnosisRate(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const random = (Math.abs(hash) % 1000) / 1000;
    return (90 + random * 9.9).toFixed(1);
  }

  let diagnosisRate = $derived(getDiagnosisRate(result?.roast || ''));

  // Theme Logic
  const themes = {
    roast: {
      primary: '#007722',
      secondary: '#007722',
      bg: 'bg-white',
      text: 'text-slate-800',
      accent: 'rgba(0, 119, 34, 0.1)',
      border: 'border-[#007722]',
      shadow: 'shadow-[8px_8px_0px_0px_rgba(0,119,34,0.2)]',
      font: 'font-sans',
      label: '诊断对象 ID',
      rate: '确诊率'
    },
    compliment: {
      primary: '#B8860B', // Gold
      secondary: '#C00000', // Crimson
      bg: 'bg-[#fffdf0]', // Pale parchment
      text: 'text-[#4a3728]', // Dark brown
      accent: 'rgba(184, 134, 11, 0.1)',
      border: 'border-[#B8860B]',
      shadow: 'shadow-[10px_10px_0px_0px_rgba(192,0,0,0.1)]',
      font: 'font-serif',
      label: '荣光记录 ID',
      rate: '契合度'
    }
  };

  let theme = $derived(themes[mode as keyof typeof themes] || themes.roast);

  // Radar Chart Logic
  const axes = ['文艺', '现充', '怀旧', '致郁', '死宅', '硬核'];
  const keys = ['pretentiousness', 'mainstream', 'nostalgia', 'darkness', 'geekiness', 'hardcore'];

  const radius = 80;
  const center = 100;
  const angleStep = (Math.PI * 2) / 6;

  function getPoint(index: number, value: number) {
    const angle = -Math.PI / 2 + index * angleStep;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }

  // Determine polygon points
  let points = $derived(
    keys
      .map((key, i) => {
        const value = result?.scores?.[key] ?? 0;
        return getPoint(i, value);
      })
      .join(' '),
  );

  // Tooltip Logic
  let hoveredAxisIndex = $state<number | null>(null);

  const axisDefinitions = [
    {
      title: 'pretentiousness (装 X 值 / 逼格)',
      meaning: '看了多少晦涩难懂、高分冷门、哲学、纪录片、古典乐、实验电影。',
      high: '塔尔科夫斯基、《尤利西斯》、古尔德。',
      low: '漫威、爽文、抖音神曲。',
    },
    {
      title: 'mainstream (从众度 / 现充值)',
      meaning: '与当下流行趋势的重合度。是不是只看 Top 250？是不是什么火看什么？',
      high: '贾玲、《三体》、周杰伦、霉霉。',
      low: '只有几百人标记的冷门B级片、地下乐队。',
    },
    {
      title: 'nostalgia (怀旧值 / 遗老度)',
      meaning: '内容的时间跨度。',
      high: '喜爱黑白片、80/90年代港片、经典文学、老摇滚。',
      low: '追新番、追当季美剧、看网络小说。',
    },
    {
      title: 'darkness (致郁度 / 阴暗值)',
      meaning: '内容的情绪色彩。包括恐怖、惊悚、悲剧、致郁系、重金属、犯罪。',
      high: '《熔炉》、伊藤润二、太宰治、后摇。',
      low: '喜剧、合家欢、励志书、大型连载巨制、正能量。',
    },
    {
      title: 'geekiness (死宅值 / 浓度)',
      meaning: '泛 acg，但范围更广。包含科幻、奇幻、魔幻、动漫、游戏改编、硬核推理。',
      high: '赛博朋克、高达、魔戒、克苏鲁、硬科幻。',
      low: '现实主义题材、生活剧、职场书。',
    },
    {
      title: 'hardcore (硬核度 / 理性值)',
      meaning: '关注内容的知识密度、逻辑性和现实主义。包括历史传记、非虚构、硬科幻、技术书籍、商业管理、政治经济。',
      high: '《国富论》、《黑客帝国》、非虚构写作、技术文档、硬科幻。',
      low: '纯娱乐、霸道总裁爱上我、无脑综艺、口水歌。',
    },
  ];

  function getTooltipStyle(index: number) {
    const p = getPoint(index, 115).split(',');
    const x = parseFloat(p[0]);
    const y = parseFloat(p[1]);
    return `left: ${x / 2}%; top: ${y / 2}%;`;
  }

  function getTooltipClass(index: number) {
    if (index === 0) return '-translate-x-1/2 -translate-y-full -mt-2'; // Top
    if (index === 1 || index === 2) return 'translate-x-2 -translate-y-1/2'; // Right
    return '-translate-x-full -translate-x-2 -translate-y-1/2'; // Left (3, 4)
  }

  import QRCode from 'qrcode';
  import { onMount } from 'svelte';

  let cardElement: HTMLElement;
  let isExporting = $state(false);
  let showLogs = $state(false);
  let qrCodeUrl = $state('');

  onMount(async () => {
    try {
      qrCodeUrl = await QRCode.toDataURL('https://rmd.aeriszhu.com/', {
        margin: 0,
        width: 100,
        color: {
          dark: theme.primary,
          light: '#00000000',
        },
      });
    } catch (err) {
      console.error('QR Code generation failed:', err);
    }
  });

  async function handleShare() {
    if (!cardElement || isExporting) return;
    isExporting = true;
    const fileName = `roast-my-douban-${Date.now()}.png`;

    try {
      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: mode === 'compliment' ? '#fffdf0' : '#ffffff',
      });

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && typeof navigator !== 'undefined' && (navigator as any).canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, {type: 'image/png'});
          const shareData = {
            files: [file],
            title: 'Roast My Douban',
            text: '看看我的豆瓣标记成分诊断结果！ #RoastMyDouban',
          };

          if ((navigator as any).canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch (shareError) {
          console.warn('Web Share API failed, falling back to download:', shareError);
        }
      }

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="w-full mx-auto">
  <div
    bind:this={cardElement}
    class="{theme.bg} {theme.border} {theme.shadow} border-4 p-5 pb-3 md:pb-4 md:px-8 md:pt-6 w-full mx-auto {theme.text} {theme.font} relative group transition-all duration-500 overflow-hidden"
  >
    <!-- Background Decoration for Compliment -->
    {#if mode === 'compliment'}
      <div class="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] rotate-12 scale-150">
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" fill={theme.primary} />
        </svg>
      </div>
      
      <!-- Big Red Flower -->
      <div class="absolute -top-10 -left-10 w-32 h-32 md:w-40 md:h-40 z-30 drop-shadow-lg opacity-90 animate-pulse">
        <svg viewBox="0 0 200 200" class="w-full h-full">
          <defs>
            <radialGradient id="flowerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#ff4444" />
              <stop offset="100%" style="stop-color:#C00000" />
            </radialGradient>
          </defs>
          <g transform="translate(100,100)">
            {#each Array(12) as _, i}
              <ellipse 
                cx="0" cy="-40" rx="30" ry="50" 
                fill="url(#flowerGrad)" 
                transform="rotate({i * 30})"
                stroke="#FFD700"
                stroke-width="1"
              />
            {/each}
            <circle cx="0" cy="0" r="25" fill="#FFD700" />
            <text x="0" y="8" text-anchor="middle" class="text-[20px] font-bold fill-[#C00000]">奖</text>
          </g>
        </svg>
      </div>

      <!-- Gold Corner Frames -->
      <div class="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#B8860B] opacity-40"></div>
      <div class="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#B8860B] opacity-40"></div>
    {/if}

    <div class="relative z-20">
      <header class="border-b-2 border-opacity-20 pb-4 mb-8 flex justify-between items-end" style="border-color: {theme.primary}">
        <div>
          <h2 class="text-xs uppercase tracking-widest mb-1 opacity-70" style="color: {theme.primary}">{theme.label}</h2>
          <h1 class="text-[26px] sm:text-4xl font-bold uppercase tracking-tighter" style="color: {mode === 'compliment' ? theme.secondary : theme.primary}">{result.archetype}</h1>
        </div>
        <div class="text-right flex flex-col items-end gap-2">
          <span class="px-3 py-1 bg-gradient-to-r text-white text-[10px] font-bold rounded-full uppercase tracking-tighter shadow-sm"
                style="background: {mode === 'compliment' ? `linear-gradient(to right, ${theme.secondary}, ${theme.primary})` : theme.primary}">
            {mode === 'roast' ? '毒舌版' : '金榜版'}
          </span>
          <div class="flex flex-col items-end">
             <span class="text-xs opacity-50 block" style="color: {theme.primary}">{theme.rate}</span>
             <span class="text-2xl font-bold" style="color: {theme.primary}">{diagnosisRate}{mode === 'compliment' ? '↑' : '%'}</span>
          </div>
        </div>
      </header>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-24 mb-10 relative">
        <div class="relative flex-shrink-0">
          <svg width="180" height="180" viewBox="0 0 200 200" class="overflow-visible">
            {#each [20, 40, 60, 80, 100] as level}
              <polygon
                points={keys.map((_, i) => getPoint(i, level)).join(' ')}
                fill="none"
                stroke={theme.primary}
                stroke-width="1"
                class="opacity-10"
              />
            {/each}

            {#each keys as _, i}
              <line
                x1={center} y1={center}
                x2={getPoint(i, 100).split(',')[0]}
                y2={getPoint(i, 100).split(',')[1]}
                stroke={theme.primary}
                stroke-width="1"
                class="opacity-20"
              />
              <text
                x={getPoint(i, 115).split(',')[0]}
                y={getPoint(i, 115).split(',')[1]}
                text-anchor="middle"
                dominant-baseline="middle"
                fill={theme.primary}
                class="text-[10px] font-bold cursor-help hover:opacity-75 transition-opacity"
                role="button"
                tabindex="0"
                onmouseenter={() => (hoveredAxisIndex = i)}
                onmouseleave={() => (hoveredAxisIndex = null)}
              >
                {axes[i]}
              </text>
            {/each}

            <polygon points={points} fill={theme.accent} stroke={theme.primary} stroke-width="2" />

            {#each keys as key, i}
              <circle
                cx={getPoint(i, result?.scores?.[key] || 0).split(',')[0]}
                cy={getPoint(i, result?.scores?.[key] || 0).split(',')[1]}
                r="3"
                fill={theme.primary}
              />
            {/each}
          </svg>

          {#if hoveredAxisIndex !== null && !isExporting}
            <div
              class="absolute bg-white shadow-xl rounded-lg p-4 w-68 z-[100] text-xs pointer-events-none border {getTooltipClass(hoveredAxisIndex)}"
              style="{getTooltipStyle(hoveredAxisIndex)} border-color: {theme.primary}40"
            >
              <h3 class="font-bold mb-2" style="color: {theme.primary}">{axisDefinitions[hoveredAxisIndex].title}</h3>
              <div class="space-y-2 {theme.text} opacity-80">
                <p><span class="font-bold opacity-70">含义:</span> {axisDefinitions[hoveredAxisIndex].meaning}</p>
                <p><span class="font-bold opacity-70">高分:</span> {axisDefinitions[hoveredAxisIndex].high}</p>
                <p><span class="font-bold opacity-70">低分:</span> {axisDefinitions[hoveredAxisIndex].low}</p>
              </div>
            </div>
          {/if}
        </div>

        <div class="flex flex-wrap justify-center gap-3 max-w-[320px]">
          {#each result?.tags || [] as tag}
            <span
              class="px-3 py-1.5 flex items-center justify-center border text-xs rounded-full uppercase tracking-wider font-bold whitespace-nowrap shadow-sm"
              style="background-color: {mode === 'compliment' ? '#fffdf0' : '#ffffff'}; border-color: {theme.primary}40; color: {theme.primary}"
            >
              {tag}
            </span>
          {/each}
        </div>
      </div>

      <div class="relative px-2 -mx-3 md:mx-0 py-6">
        <div class="absolute left-0 top-0 text-5xl opacity-20 font-serif rotate-15" style="color: {theme.primary}">"</div>
        <p class="leading-relaxed text-center font-serif text-sm md:text-lg mb-4 select-text" 
           style="color: {theme.text}; font-style: {mode === 'compliment' ? 'normal' : 'italic'}">
          {result.roast}
        </p>
        <div class="absolute right-0 bottom-0 text-5xl opacity-20 font-serif rotate-15" style="color: {theme.primary}">"</div>
        
        {#if mode === 'compliment'}
          <div class="mt-8 flex justify-end items-center gap-4 opacity-80">
            <div class="text-right">
              <p class="text-[10px] uppercase tracking-[0.2em] font-bold" style="color: {theme.primary}">Douban Cultural Committee</p>
              <p class="text-xs font-serif italic" style="color: {theme.secondary}">豆瓣精神文明建设委员会 颁发</p>
            </div>
            <div class="w-12 h-12 rounded-full border-2 border-double flex items-center justify-center" style="border-color: {theme.secondary}">
               <div class="w-10 h-10 rounded-full border bg-red-600/10 flex items-center justify-center text-[10px] font-bold" style="border-color: {theme.secondary}; color: {theme.secondary}">
                 勋章
               </div>
            </div>
          </div>
        {/if}
      </div>

      {#if result.item_analysis && result.item_analysis.length > 0}
        <div class="mt-8 -mx-1 pt-4 border-t border-opacity-10" style="border-color: {theme.primary}">
            <button
              class="w-full flex items-center justify-between transition-colors text-xs font-bold uppercase tracking-widest group h-12 relative"
              style="color: {theme.primary}80"
              onclick={() => (showLogs = !showLogs)}
            >
            <span class="group-hover:opacity-100 transition-opacity">
              <span class="mr-2">[{showLogs ? '-' : '+'}]</span>
              {mode === 'compliment' ? '光辉历程' : '侧写日志'} ({result.item_analysis.length})
            </span>
            
            <div class="relative flex items-center justify-end">
              {#if qrCodeUrl && !showLogs}
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  class="w-10 h-10 object-contain transition-opacity duration-300 opacity-80 group-hover:opacity-0 absolute right-0"
                />
              {/if}
              <span class="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">点击{showLogs ? '收起' : '展开'}</span>
            </div>
            </button>

            {#if showLogs}
              <div class="space-y-3 mt-4 animate-in slide-in-from-top-2 duration-300">
                {#each result.item_analysis as item}
                  <div class="text-xs leading-relaxed font-mono p-3 rounded border border-opacity-10"
                       style="background-color: {mode === 'compliment' ? 'rgba(184, 134, 11, 0.03)' : '#f9f9f9'}; border-color: {theme.primary}20">
                    <div class="flex items-baseline justify-between gap-2 mb-2">
                      <div class="font-bold shrink-0" style="color: {theme.primary}">《{item[0]}》</div>
                      {#if item[2]}
                        <div class="text-[10px] line-clamp-2 leading-tight text-right italic font-serif opacity-60">
                          {item[2]}
                        </div>
                      {/if}
                    </div>
                    <div class="pl-2 border-l-2" style="border-color: {theme.primary}40; color: {theme.text}">
                      <span class="font-bold opacity-80">[{mode === 'compliment' ? '赏析' : '洞察'}]</span> {item[1]}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
        </div>
      {/if}
    </div>
  </div>

  <footer class="flex items-center justify-center gap-4 py-6 mt-4">
    <button
      onclick={() => window.location.reload()}
      class="px-6 py-2.5 font-bold uppercase tracking-wider text-sm transition-all rounded active:scale-95 border-2"
      style="background-color: {theme.primary}10; border-color: {theme.primary}20; color: {theme.primary}"
    >
      <svg class="inline mr-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      返回
    </button>

    <button
      onclick={handleShare}
      disabled={isExporting}
      class="px-8 py-2.5 text-white font-bold uppercase tracking-widest text-sm transition-all shadow-md active:translate-y-1 active:shadow-none rounded flex items-center gap-2 disabled:opacity-50"
      style="background-color: {mode === 'compliment' ? theme.secondary : theme.primary}"
    >
      {isExporting ? '制作中...' : (mode === 'compliment' ? '保存奖状' : '分享诊断单')}
    </button>
  </footer>
</div>
