import { useState, useEffect, useRef } from 'react'
CUELINKS_PUB_ID
function App() {
  // Biometric Profile states
  const [profile, setProfile] = useState(null)
  const [gender, setGender] = useState('Women')
  const [height, setHeight] = useState("5'4\"")
  const [skinTone, setSkinTone] = useState('Wheatish')
  const [bodyType, setBodyType] = useState('Average')

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState('dark')

  // Discovery & Filter states
  const [occasion, setOccasion] = useState('Diwali / Festival')
  const [outfitFormat, setOutfitFormat] = useState('All Formats (Mix)')
  const [budget, setBudget] = useState('3000')
  const [comboCount, setComboCount] = useState(5)
  const [batchOffset, setBatchOffset] = useState(0)

  // Habit-Forming View & Closet states
  const [viewMode, setViewMode] = useState('swipe') // 'swipe' | 'grid' | 'closet'
  const [activeIndex, setActiveIndex] = useState(0)
  const [swipeAnim, setSwipeAnim] = useState('') // 'left' | 'right' | ''
  const [savedCloset, setSavedCloset] = useState([])
  const [showHeartPopup, setShowHeartPopup] = useState(false)

  // UI & Loading states
  const [loading, setLoading] = useState(false)
  const [interstitialStep, setInterstitialStep] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [combos, setCombos] = useState([])

  // Virtual Try-On Modal states
  const [aiModalData, setAiModalData] = useState(null)
  const [generatingSnapshot, setGeneratingSnapshot] = useState(false)
  const [copiedState, setCopiedState] = useState('')

  // Touch Swipe coordinates
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  // Cloudflare Worker URL
  const WORKER_URL = "https://aistylist.hritik-sk01.workers.dev"

  // Cuelinks Publisher ID wrapper
  const CUELINKS_PUB_ID = "332270"

  const formatAffiliateLink = (url) => {
    if (!url) return '#'
    if (!CUELINKS_PUB_ID) return url
    return `https://linksredirect.com/?pub_id=${CUELINKS_PUB_ID}&source=linkkit&url=${encodeURIComponent(url)}`
  }

  // Load persistent profile, theme, and saved closet
  useEffect(() => {
    const savedProf = localStorage.getItem('desiProfileV5')
    if (savedProf) {
      const parsed = JSON.parse(savedProf)
      setProfile(parsed)
      setGender(parsed.gender || 'Women')
    }
    const savedTheme = localStorage.getItem('desiThemeV5')
    if (savedTheme) setTheme(savedTheme)

    const savedLikes = localStorage.getItem('desiClosetV5')
    if (savedLikes) setSavedCloset(JSON.parse(savedLikes))
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('desiThemeV5', next)
  }

  // Adaptive Design Tokens
  const t = theme === 'dark' ? {
    bg: '#09090b', card: '#141418', inner: '#1c1c22', border: '#2a2a32',
    text: '#fafafa', muted: '#a1a1aa', accent: '#f43f5e'
  } : {
    bg: '#f8fafc', card: '#ffffff', inner: '#f1f5f9', border: '#e2e8f0',
    text: '#0f172a', muted: '#64748b', accent: '#f43f5e'
  }

  const saveProfile = () => {
    const newProfile = { gender, height, skinTone, bodyType }
    localStorage.setItem('desiProfileV5', JSON.stringify(newProfile))
    setProfile(newProfile)
  }

  const resetProfile = () => {
    localStorage.removeItem('desiProfileV5')
    setProfile(null)
    setCombos([])
    setAiModalData(null)
  }

  // Toggle Save Look to Closet
  const toggleSaveLook = (combo) => {
    const exists = savedCloset.some(c => c.look_name === combo.look_name)
    let updated
    if (exists) {
      updated = savedCloset.filter(c => c.look_name !== combo.look_name)
    } else {
      updated = [combo, ...savedCloset]
      setShowHeartPopup(true)
      setTimeout(() => setShowHeartPopup(false), 800)
    }
    setSavedCloset(updated)
    localStorage.setItem('desiClosetV5', JSON.stringify(updated))
  }

  const isLookSaved = (combo) => savedCloset.some(c => c.look_name === combo?.look_name)

  const formatOptions = profile?.gender === 'Women'
    ? ['All Formats (Mix)', 'Saree Ensemble', 'Kurta Set / Lehenga', 'One-Piece / Dress', 'Top + Bottom Combo']
    : ['All Formats (Mix)', 'Top + Bottom Combo', 'Kurta Set / Sherwani', 'Co-ord Set']

  const interstitialTexts = [
    `Analyzing ${profile?.skinTone || 'Indian'} skin undertone & ${profile?.bodyType || 'body'} frame...`,
    `Curating trending ${occasion} palettes for ${profile?.gender || 'your'} profile...`,
    `Balancing silhouette proportions across verified Indian e-commerce catalogs...`,
    `Finalizing 4-piece bundle pricing to stay under ₹${budget}...`
  ]

  const fetchCombos = async (isLoadMore = false, forceFresh = false, customFormat = null) => {
    const activeFormat = customFormat || outfitFormat
    const nextOffset = isLoadMore ? batchOffset + 1 : 0
    const cacheKey = `v5_${profile.gender}_${profile.skinTone}_${profile.bodyType}_${occasion}_${activeFormat}_${budget}_${comboCount}_${nextOffset}`

    if (!isLoadMore && !forceFresh) {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setCombos(JSON.parse(cached))
        setActiveIndex(0)
        setBatchOffset(0)
        return
      }
    }

    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setInterstitialStep(0)
    }

    const timer = setInterval(() => {
      setInterstitialStep(prev => (prev < 3 ? prev + 1 : prev))
    }, 1100)

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: profile.gender,
          height: profile.height,
          skinTone: profile.skinTone,
          bodyType: profile.bodyType,
          occasion,
          outfitFormat: activeFormat,
          budget,
          count: isLoadMore ? 5 : Number(comboCount),
          batchOffset: nextOffset
        })
      })
      const data = await response.json()

      if (data.error) {
        alert("Stylist Service Notice: " + data.error)
      } else if (data.combos) {
        if (isLoadMore) {
          setCombos(prev => [...prev, ...data.combos])
          setBatchOffset(nextOffset)
        } else {
          setCombos(data.combos)
          setActiveIndex(0)
          setBatchOffset(0)
          sessionStorage.setItem(cacheKey, JSON.stringify(data.combos))
        }
      }
    } catch (error) {
      alert("Network Error: " + error.message)
    }

    clearInterval(timer)
    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    if (profile && combos.length === 0 && !loading) {
      fetchCombos(false, false)
    }
  }, [profile])

  const handleSwipeCard = (direction) => {
    if (combos.length === 0) return
    const currentCombo = combos[activeIndex]

    if (direction === 'like' && currentCombo && !isLookSaved(currentCombo)) {
      toggleSaveLook(currentCombo)
    }

    setSwipeAnim(direction === 'prev' ? 'right' : 'left')
    setTimeout(() => {
      setSwipeAnim('')
      if (direction === 'prev') {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : combos.length - 1))
      } else {
        if (activeIndex + 1 < combos.length) {
          setActiveIndex(prev => prev + 1)
        } else {
          fetchCombos(true, true)
          setActiveIndex(prev => prev + 1)
        }
      }
    }, 150)
  }

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) handleSwipeCard('next')
      else handleSwipeCard('prev')
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Viral Share to WhatsApp, Telegram, etc.
  const shareComboToSocial = async (combo) => {
    const items = combo.items || []
    const lines = items.map((it) =>
      `• ${it.part} (${it.color}): ${formatAffiliateLink(it.buy_link)}`
    ).join('\n')

    const shareText = `🔥 Check out this curated ${combo.ensemble_type || 'look'} for ${occasion} (${combo.total_price_range || `Under ₹${budget}`}):\n\n"${combo.look_name}"\n${combo.style_tip ? `Stylist Note: ${combo.style_tip}\n` : ''}\nShop the pieces:\n${lines}\n\nStyled 100% free with StyleAI!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `StyleAI: ${combo.look_name}`,
          text: shareText
        })
        return
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(shareText)
      alert("Look details & affiliate product links copied to clipboard! Paste directly into WhatsApp or Instagram.")
    } catch (e) {
      alert("Unable to copy automatically.")
    }
  }

  // Master Prompt for BYO-AI Try-On
  const buildMasterPrompts = (combo) => {
    const items = combo.items || []
    const cleanName = (str) => (str || '').replace(/^Men\s+|^Women\s+|'s\s+/i, '').trim()

    const slotDescriptions = items.map((it, idx) =>
      `- Panel [${idx + 1}] (${(it.part || 'Item').toUpperCase()}): ONLY extract the ${it.color} ${cleanName(it.name)}.`
    ).join('\n')

    const wearingList = items.map((it, idx) =>
      `${idx + 1}. ${(it.part || 'PIECE').toUpperCase()}: ${it.color} ${cleanName(it.name)}`
    ).join('\n')

    const isOnePieceOrSaree = (combo.ensemble_type || '').toLowerCase().match(/saree|one-piece|dress|kurta|co-ord/) ||
      items.some(i => (i.part || '').toLowerCase().match(/saree|dress|kurta set|co-ord/))

    const ensembleRule = isOnePieceOrSaree
      ? `ENSEMBLE DRAPE RULE: This look is a "${combo.ensemble_type || 'Complete Ensemble'}". Item #1 (${items[0]?.part}) is the full primary outfit (Saree / Dress / Complete Kurta Set). Style the model wearing Item #1 naturally and accessorize with Items #2, #3, and #4. Do NOT invent mismatched pants or extra jackets.`
      : `2-PIECE COMBO RULE: Pair Item #1 (${items[0]?.part}) on the upper body with Item #2 (${items[1]?.part}) on the lower body, worn with Item #3 (${items[2]?.part}) and Item #4 (${items[3]?.part}).`

    const masterPrompt = `Generate a single, hyper-realistic full-body studio fashion photograph of ONE real Indian ${profile.gender} model wearing the exact 4 items specified below.

CRITICAL REFERENCE IMAGE RULE (IF IMAGE IS ATTACHED):
The attached image is a 4-panel product reference board. Extract ONLY the specific named item from each panel:
${slotDescriptions}
IGNORE any human faces, mannequins, or extra layering clothes (like jackets or inner tops) worn by catalog models inside the individual product thumbnails.

${ensembleRule}

MODEL BIOMETRICS & APPEARANCE:
- Ethnicity & Gender: Authentic Indian ${profile.gender} fashion model
- Skin Complexion: ${profile.skinTone} Indian skin tone with realistic skin texture
- Body Proportions: ${profile.bodyType} build, ${profile.height} height
- Pose & Framing: Full-body head-to-toe standing editorial pose (head and footwear 100% visible)

EXACT 4 ITEMS TO WEAR TOGETHER:
${wearingList}

STRICT QUALITY & COLOR CONSTRAINTS:
- Exact color lock: ${items.map(i => `${i.color} ${i.part}`).join(', ')}.
- Output ONE single cohesive full-body photograph (do NOT generate a 4-panel collage).
- Shot on Canon EOS R5, 85mm f/1.8 lens, luxury Indian fashion editorial lighting for ${occasion}.`

    const shortUrlPrompt = `Generate 1 full-body photorealistic studio photo of a real Indian ${profile.gender} model (${profile.skinTone} skin, ${profile.bodyType} build, ${profile.height}) wearing this exact ${combo.ensemble_type || 'outfit'}: ${items.map((it, idx) => `(${idx + 1}) ${it.part}: ${it.color} ${cleanName(it.name)}`).join(', ')}. Ignore extra models/jackets in thumbnails. Output 1 full-body head-to-toe photo with exact colors.`

    return { masterPrompt, shortUrlPrompt }
  }

  // Stitched Canvas Card Generator
  const loadCanvasImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = () => {
        const fallbackImg = new Image()
        fallbackImg.crossOrigin = "anonymous"
        fallbackImg.onload = () => resolve(fallbackImg)
        fallbackImg.onerror = () => resolve(null)
        fallbackImg.src = src
      }
      img.src = `${WORKER_URL}?proxy_img=${encodeURIComponent(src)}`
    })
  }

  const generateComboCardScreenshot = async (combo) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 830
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#09090b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#18181b'
    ctx.fillRect(24, 20, 1152, 115)

    ctx.fillStyle = '#f43f5e'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText(`AI VIRTUAL TRY-ON SPEC SHEET • ${(combo.ensemble_type || 'COMPLETE LOOK').toUpperCase()} • ${occasion.toUpperCase()}`, 44, 50)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText(`${combo.look_name} (${combo.total_price_range || ''})`, 44, 84)

    ctx.fillStyle = '#e4e4e7'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText(`TARGET MODEL: Indian ${profile.gender} | Skin: ${profile.skinTone} | Body: ${profile.bodyType} | Height: ${profile.height}`, 44, 114)

    const items = (combo.items || []).slice(0, 4)
    const loadedImages = await Promise.all(items.map(item => loadCanvasImage(item.image)))

    const cardWidth = 273
    const cardHeight = 530
    const startX = 24
    const startY = 152
    const gap = 20

    items.forEach((item, idx) => {
      const x = startX + idx * (cardWidth + gap)
      const y = startY

      ctx.fillStyle = '#18181b'
      ctx.fillRect(x, y, cardWidth, cardHeight)
      ctx.strokeStyle = '#27272a'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, cardWidth, cardHeight)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(`[${idx + 1}] ${(item.part || 'ITEM').toUpperCase()} ONLY`, x + 16, y + 28)

      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(`Exact Color: ${item.color || 'Matched'}`, x + 16, y + 50)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + 14, y + 64, cardWidth - 28, 330)

      const img = loadedImages[idx]
      if (img) {
        try {
          const scale = Math.min((cardWidth - 40) / img.width, 310 / img.height)
          const drawW = img.width * scale
          const drawH = img.height * scale
          const drawX = x + 14 + (cardWidth - 28 - drawW) / 2
          const drawY = y + 64 + (330 - drawH) / 2
          ctx.drawImage(img, drawX, drawY, drawW, drawH)
        } catch (e) {}
      }

      ctx.fillStyle = '#f4f4f5'
      ctx.font = 'bold 14px sans-serif'
      const words = (item.name || '').split(' ')
      let line1 = ''
      let line2 = ''
      words.forEach(w => {
        if ((line1 + w).length < 29) line1 += w + ' '
        else if ((line2 + w).length < 29) line2 += w + ' '
      })
      ctx.fillText(line1.trim(), x + 16, y + 424)
      if (line2) ctx.fillText(line2.trim(), x + 16, y + 444)

      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 17px sans-serif'
      ctx.fillText(item.price || '', x + 16, y + 478)

      ctx.fillStyle = '#a1a1aa'
      ctx.font = '12px sans-serif'
      ctx.fillText(`Extract only this ${item.part}`, x + 16, y + 508)
    })

    ctx.fillStyle = '#18181b'
    ctx.fillRect(24, 700, 1152, 108)
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 2
    ctx.strokeRect(24, 700, 1152, 108)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText(`AI INSTRUCTION: Generate 1 full-body head-to-toe photo of an Indian ${profile.gender} (${profile.skinTone} skin, ${profile.bodyType}, ${profile.height})`, 44, 734)
    ctx.fillStyle = '#d4d4d8'
    ctx.font = '15px sans-serif'
    ctx.fillText(`wearing ${items.map((it, i) => `[${i + 1}] ${it.color} ${it.part}`).join(' + ')}.`, 44, 762)
    ctx.fillStyle = '#fda4af'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(`RULE: Combine only the 4 named items above onto 1 person. Ignore any extra models or clothes inside product boxes.`, 44, 790)

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      return { dataUrl, blob }
    } catch (e) {
      return { dataUrl: null, blob: null }
    }
  }

  const openAiAppChooser = async (combo) => {
    setCopiedState('')
    setGeneratingSnapshot(true)
    const { masterPrompt, shortUrlPrompt } = buildMasterPrompts(combo)

    setAiModalData({ combo, masterPrompt, shortUrlPrompt, screenshotDataUrl: null, screenshotBlob: null })
    const { dataUrl, blob } = await generateComboCardScreenshot(combo)
    setAiModalData({ combo, masterPrompt, shortUrlPrompt, screenshotDataUrl: dataUrl, screenshotBlob: blob })
    setGeneratingSnapshot(false)
  }

  const triggerFeedback = (type) => {
    setCopiedState(type)
    setTimeout(() => setCopiedState(''), 3500)
  }

  const handleCopyPromptOnly = async () => {
    if (!aiModalData) return
    try {
      await navigator.clipboard.writeText(aiModalData.masterPrompt)
      triggerFeedback('prompt')
    } catch (e) {
      triggerFeedback('prompt')
    }
  }

  const handleCopyImageOnly = async () => {
    if (!aiModalData?.screenshotBlob) return
    try {
      if (window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/png': Promise.resolve(aiModalData.screenshotBlob) })
        await navigator.clipboard.write([item])
        triggerFeedback('image')
        return
      }
    } catch (e) {}
    handleDownloadImage()
  }

  const handleCopyBoth = async () => {
    if (!aiModalData) return
    try {
      await navigator.clipboard.writeText(aiModalData.masterPrompt)
      if (aiModalData.screenshotBlob && window.ClipboardItem) {
        try {
          await new Promise(r => setTimeout(r, 120))
          const imgItem = new ClipboardItem({
            'image/png': Promise.resolve(aiModalData.screenshotBlob),
            'text/plain': Promise.resolve(new Blob([aiModalData.masterPrompt], { type: 'text/plain' }))
          })
          await navigator.clipboard.write([imgItem])
        } catch (multiErr) {
          try {
            const singleImg = new ClipboardItem({ 'image/png': Promise.resolve(aiModalData.screenshotBlob) })
            await navigator.clipboard.write([singleImg])
          } catch (e) {}
        }
      }
      triggerFeedback('both')
    } catch (err) {
      await handleCopyPromptOnly()
    }
  }

  const handleDownloadImage = () => {
    if (!aiModalData?.screenshotDataUrl) return
    const link = document.createElement('a')
    link.download = `${(aiModalData.combo.look_name || 'outfit').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
    link.href = aiModalData.screenshotDataUrl
    link.click()
    triggerFeedback('saved')
  }

  const handleNativeMobileShare = async () => {
    if (!aiModalData) return
    await handleCopyPromptOnly()
    if (navigator.share) {
      try {
        const shareData = { title: aiModalData.combo.look_name, text: aiModalData.masterPrompt }
        if (aiModalData.screenshotBlob) {
          const file = new File([aiModalData.screenshotBlob], 'outfit-tryon.png', { type: 'image/png' })
          if (!navigator.canShare || navigator.canShare({ files: [file] })) shareData.files = [file]
        }
        await navigator.share(shareData)
        return
      } catch (e) {}
    }
    await handleCopyBoth()
  }

  const launchAiApp = async (app) => {
    if (!aiModalData) return
    await handleCopyBoth()
    const q = encodeURIComponent(aiModalData.shortUrlPrompt)
    const urls = {
      chatgpt: `https://chatgpt.com/?q=${q}`,
      gemini: `https://gemini.google.com/app`,
      grok: `https://grok.com/?q=${q}`,
      copilot: `https://copilot.microsoft.com/?q=${q}`
    }
    window.open(urls[app] || urls.chatgpt, '_blank', 'noopener,noreferrer')
  }

  // ============================================================================
  // REUSABLE 100% RESPONSIVE OUTFIT CARD COMPONENT
  // ============================================================================
  const renderOutfitCard = (combo, idx, isDeckCard = false) => {
    if (!combo) return null
    const saved = isLookSaved(combo)

    return (
      <div
        key={combo.id || idx}
        onTouchStart={isDeckCard ? onTouchStart : undefined}
        onTouchEnd={isDeckCard ? onTouchEnd : undefined}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: '18px',
          padding: '14px',
          boxShadow: theme === 'dark' ? '0 16px 40px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.06)',
          transition: 'transform 0.16s ease, opacity 0.16s ease',
          transform: isDeckCard && swipeAnim === 'left' ? 'translateX(-24px) scale(0.98)' : isDeckCard && swipeAnim === 'right' ? 'translateX(24px) scale(0.98)' : 'none',
          opacity: isDeckCard && swipeAnim ? 0.6 : 1,
          overflow: 'hidden'
        }}
      >
        {/* Badges Row - Responsive Flex-Wrap */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flex: '1 1 auto', minWidth: '0' }}>
            <span style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140', padding: '3px 8px', borderRadius: '99px', fontSize: '10.5px', fontWeight: '700', whiteSpace: 'nowrap' }}>
              ⚡ {combo.match_score || '98% Match'}
            </span>
            <span style={{ background: '#f43f5e20', color: '#f43f5e', border: '1px solid #f43f5e40', padding: '3px 8px', borderRadius: '99px', fontSize: '10.5px', fontWeight: '700', whiteSpace: 'nowrap' }}>
              {combo.ensemble_type || 'Complete Look'}
            </span>
            {combo.total_price_range && (
              <span style={{ background: t.inner, color: t.text, padding: '3px 8px', borderRadius: '99px', fontSize: '10.5px', fontWeight: '600', border: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                Est: {combo.total_price_range}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              className="pill-btn"
              onClick={() => shareComboToSocial(combo)}
              style={{ background: t.inner, color: t.text, border: `1px solid ${t.border}`, padding: '4px 8px', borderRadius: '99px', cursor: 'pointer', fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap' }}
              title="Share Look on WhatsApp"
            >
              ↗ Share
            </button>
            <button
              className="pill-btn"
              onClick={() => toggleSaveLook(combo)}
              style={{ background: saved ? '#f43f5e' : t.inner, color: saved ? '#fff' : t.text, border: `1px solid ${saved ? '#f43f5e' : t.border}`, padding: '4px 9px', borderRadius: '99px', cursor: 'pointer', fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap' }}
            >
              {saved ? '❤️ Saved' : '🤍 Save'}
            </button>
          </div>
        </div>

        {/* Title, Tip & Try On Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ flex: '1 1 180px', minWidth: '0' }}>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '16.5px', fontWeight: '800', color: t.text, letterSpacing: '-0.3px', wordBreak: 'break-word' }}>
              {combo.look_name}
            </h3>
            {combo.style_tip && (
              <p style={{ margin: 0, color: t.muted, fontSize: '11.5px', lineHeight: '1.35', wordBreak: 'break-word' }}>
                ✨ {combo.style_tip}
              </p>
            )}
          </div>

          <button
            className="pill-btn"
            onClick={() => openAiAppChooser(combo)}
            style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #9333ea 100%)', color: '#ffffff', border: 'none', padding: '8px 13px', borderRadius: '99px', cursor: 'pointer', fontWeight: '700', fontSize: '11.5px', boxShadow: '0 4px 15px rgba(244,63,94,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            👤 Try On Model
          </button>
        </div>

        {/* 4-Item Responsive Grid */}
        <div className="outfit-grid">
          {(combo.items || []).map((item, itemIdx) => (
            <div
              key={itemIdx}
              className="outfit-card-item"
              style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}
            >
              <div style={{ width: '100%', minWidth: 0 }}>
                {/* Slot Label & Color */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', gap: '2px', width: '100%' }}>
                  <span style={{ color: '#f43f5e', fontWeight: '800', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.part}
                  </span>
                  <span style={{ background: t.card, color: '#d97706', padding: '1px 5px', borderRadius: '99px', fontSize: '9px', fontWeight: '600', maxWidth: '75px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: `1px solid ${t.border}`, flexShrink: 0 }}>
                    {item.color}
                  </span>
                </div>

                {/* White Image Box */}
                <div style={{ background: '#ffffff', borderRadius: '8px', padding: '4px', marginBottom: '6px', height: '135px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(item.name + " India fashion")}&w=500&h=600&c=7&rs=1&p=0`
                    }}
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                  />
                </div>

                {/* Item Name */}
                <p style={{ margin: '0 0 2px 0', fontWeight: '600', fontSize: '11px', color: t.text, lineHeight: '1.25', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', minHeight: '26px' }}>
                  {item.name}
                </p>
                <p style={{ margin: '0 0 6px 0', color: '#10b981', fontWeight: '800', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                  {item.price}
                </p>
              </div>

              {/* Store Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px', width: '100%' }}>
                <a href={formatAffiliateLink(item.buy_link)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', minWidth: 0 }}>
                  <button style={{ width: '100%', background: '#f59e0b', color: '#09090b', border: 'none', padding: '5px 1px', cursor: 'pointer', borderRadius: '5px', fontWeight: '800', fontSize: '9.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Amazon
                  </button>
                </a>
                <a href={formatAffiliateLink(item.myntra_link)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', minWidth: 0 }}>
                  <button style={{ width: '100%', background: t.card, color: t.text, border: `1px solid ${t.border}`, padding: '5px 1px', cursor: 'pointer', borderRadius: '5px', fontWeight: '600', fontSize: '9.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Myntra
                  </button>
                </a>
                <a href={formatAffiliateLink(item.ajio_link)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', minWidth: 0 }}>
                  <button style={{ width: '100%', background: t.card, color: t.text, border: `1px solid ${t.border}`, padding: '5px 1px', cursor: 'pointer', borderRadius: '5px', fontWeight: '600', fontSize: '9.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Ajio
                  </button>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ============================================================================
  // BULLETPROOF RESPONSIVE CSS INJECTIONS
  // ============================================================================
  const styles = `
    * {
      box-sizing: border-box !important;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100vw;
      max-width: 100%;
      overflow-x: hidden;
      background: ${t.bg};
      color: ${t.text};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      transition: background 0.2s, color 0.2s;
    }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${t.bg}; }
    ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 99px; }
    .pill-btn { transition: transform 0.12s ease; }
    .pill-btn:active { transform: scale(0.95); }
    .hide-scroll::-webkit-scrollbar { display: none; }

    /* Fluid Multi-Device Grid: 4 items on desktop/tablet, 2 on smartphone */
    .outfit-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      width: 100%;
    }
    .outfit-card-item {
      min-width: 0;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .outfit-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px !important;
      }
    }

    @media (max-width: 350px) {
      .outfit-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `

  // ============================================================================
  // SCREEN 1: ONBOARDING QUIZ (NO LOGIN REQUIRED)
  // ============================================================================
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: t.bg }}>
        <style>{styles}</style>
        <div style={{ maxWidth: '420px', width: '100%', background: t.card, padding: '22px', borderRadius: '22px', border: `1px solid ${t.border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ background: '#f43f5e20', color: '#f43f5e', padding: '3px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '700' }}>
              ✨ AI STYLIST • INDIA
            </span>
            <button onClick={toggleTheme} style={{ background: t.inner, border: `1px solid ${t.border}`, color: t.text, padding: '5px 10px', borderRadius: '99px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>

          <h2 style={{ margin: '6px 0 4px 0', fontSize: '21px', fontWeight: '800', color: t.text }}>Find Your Signature Look</h2>
          <p style={{ color: t.muted, fontSize: '12.5px', margin: '0 0 16px 0' }}>
            Sarees, Kurta Sets, Dresses & Combos tailored to your skin tone & budget.
          </p>

          <label style={{ fontSize: '11.5px', color: t.muted, fontWeight: '600' }}>Gender</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '5px 0 14px 0' }}>
            {['Women', 'Men'].map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                style={{ padding: '10px', borderRadius: '10px', border: gender === g ? '1.5px solid #f43f5e' : `1px solid ${t.border}`, background: gender === g ? '#f43f5e18' : t.inner, color: gender === g ? t.text : t.muted, fontWeight: '700', cursor: 'pointer' }}
              >
                {g === 'Women' ? '👩 Women' : '👨 Men'}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '11.5px', color: t.muted, fontWeight: '600' }}>Skin Undertone</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', margin: '5px 0 14px 0' }}>
            {[
              { name: 'Fair', swatch: '#f5d0b5' },
              { name: 'Wheatish', swatch: '#d8a47f' },
              { name: 'Dusky', swatch: '#a66e4e' },
              { name: 'Deep / Rich', swatch: '#6f422b' }
            ].map(t_item => (
              <button
                key={t_item.name}
                onClick={() => setSkinTone(t_item.name)}
                style={{ padding: '9px', borderRadius: '10px', border: skinTone === t_item.name ? '1.5px solid #f43f5e' : `1px solid ${t.border}`, background: skinTone === t_item.name ? '#f43f5e18' : t.inner, color: skinTone === t_item.name ? t.text : t.muted, fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: t_item.swatch, display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
                {t_item.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '11.5px', color: t.muted, fontWeight: '600' }}>Body Frame</label>
              <select style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '10px', background: t.inner, color: t.text, border: `1px solid ${t.border}`, fontSize: '12px' }} value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                <option>Average</option>
                <option>Slim</option>
                <option>Broad / Athletic</option>
                <option>Curvy / Plus</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', color: t.muted, fontWeight: '600' }}>Height</label>
              <select style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '10px', background: t.inner, color: t.text, border: `1px solid ${t.border}`, fontSize: '12px' }} value={height} onChange={(e) => setHeight(e.target.value)}>
                <option>5'2"</option>
                <option>5'4"</option>
                <option>5'6"</option>
                <option>5'8"</option>
                <option>5'10"</option>
                <option>6'0"+</option>
              </select>
            </div>
          </div>

          <button
            className="pill-btn"
            style={{ width: '100%', padding: '13px', background: 'linear-gradient(90deg, #f43f5e, #db2777)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '12px', fontWeight: '800', fontSize: '14.5px' }}
            onClick={saveProfile}
          >
            Start Styling →
          </button>
        </div>
      </div>
    )
  }

  // ============================================================================
  // SCREEN 2: MAIN DASHBOARD & SWIPE DECK
  // ============================================================================
  return (
    <div style={{ width: '100%', maxWidth: '820px', margin: '0 auto', padding: '8px 10px 100px 10px', minHeight: '100vh', background: t.bg, color: t.text, overflowX: 'hidden' }}>
      <style>{styles}</style>

      {/* Dopamine Heart Animation Overlay */}
      {showHeartPopup && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '64px', pointerEvents: 'none', zIndex: 10000, animation: 'heartPop 0.8s ease-out forwards' }}>
          ❤️
        </div>
      )}
      <style>{`@keyframes heartPop { 0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; } 50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 0; } }`}</style>

      {/* Sticky Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: t.card, backdropFilter: 'blur(10px)', borderRadius: '14px', border: `1px solid ${t.border}`, marginBottom: '10px', position: 'sticky', top: '4px', zIndex: 50, gap: '6px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ fontWeight: '900', fontSize: '16px', color: '#f43f5e', whiteSpace: 'nowrap' }}>StyleAI</span>
          <button onClick={resetProfile} style={{ background: t.inner, color: t.muted, border: `1px solid ${t.border}`, padding: '4px 7px', borderRadius: '99px', fontSize: '10.5px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
            {profile.gender} • {profile.skinTone} ✎
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '2px', background: t.inner, padding: '2px', borderRadius: '99px', border: `1px solid ${t.border}` }}>
            <button onClick={() => setViewMode('swipe')} style={{ background: viewMode === 'swipe' ? '#f43f5e' : 'transparent', color: viewMode === 'swipe' ? '#fff' : t.muted, border: 'none', padding: '5px 9px', borderRadius: '99px', fontSize: '10.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🔥 Swipe
            </button>
            <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? '#f43f5e' : 'transparent', color: viewMode === 'grid' ? '#fff' : t.muted, border: 'none', padding: '5px 9px', borderRadius: '99px', fontSize: '10.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📑 Feed
            </button>
            <button onClick={() => setViewMode('closet')} style={{ background: viewMode === 'closet' ? '#f43f5e' : 'transparent', color: viewMode === 'closet' ? '#fff' : t.muted, border: 'none', padding: '5px 9px', borderRadius: '99px', fontSize: '10.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ❤️ ({savedCloset.length})
            </button>
          </div>

          <button onClick={toggleTheme} className="pill-btn" style={{ background: t.inner, color: t.text, border: `1px solid ${t.border}`, padding: '5px 8px', borderRadius: '99px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }} title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Outfit Format Pills */}
      <div className="hide-scroll" style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px', width: '100%' }}>
        {formatOptions.map(fmt => (
          <button
            key={fmt}
            className="pill-btn"
            onClick={() => {
              setOutfitFormat(fmt)
              fetchCombos(false, true, fmt)
            }}
            style={{
              background: outfitFormat === fmt ? (theme === 'dark' ? '#fafafa' : '#0f172a') : t.card,
              color: outfitFormat === fmt ? (theme === 'dark' ? '#09090b' : '#fafafa') : t.muted,
              border: `1px solid ${outfitFormat === fmt ? 'transparent' : t.border}`,
              padding: '6px 11px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0
            }}
          >
            {fmt}
          </button>
        ))}
      </div>

      {/* Responsive Filter Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', background: t.card, padding: '10px', borderRadius: '14px', border: `1px solid ${t.border}`, marginBottom: '12px', alignItems: 'end', width: '100%' }}>
        <div style={{ minWidth: 0 }}>
          <label style={{ fontSize: '10px', color: t.muted, fontWeight: '600' }}>Event / Occasion</label>
          <select style={{ width: '100%', padding: '8px 6px', marginTop: '3px', borderRadius: '8px', background: t.inner, color: t.text, border: `1px solid ${t.border}`, fontSize: '11.5px' }} value={occasion} onChange={(e) => setOccasion(e.target.value)}>
            <option>Diwali / Festival</option>
            <option>Wedding / Sangeet</option>
            <option>Office Casual</option>
            <option>Date Night / Party</option>
            <option>College / Streetwear</option>
            <option>Old Money / Formal</option>
          </select>
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ fontSize: '10px', color: t.muted, fontWeight: '600' }}>Budget (₹)</label>
          <input style={{ width: '100%', padding: '7px 6px', marginTop: '3px', borderRadius: '8px', background: t.inner, color: t.text, border: `1px solid ${t.border}`, fontSize: '11.5px' }} type="number" step="500" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ fontSize: '10px', color: t.muted, fontWeight: '600' }}>Batch Size</label>
          <select style={{ width: '100%', padding: '8px 6px', marginTop: '3px', borderRadius: '8px', background: t.inner, color: t.text, border: `1px solid ${t.border}`, fontSize: '11.5px' }} value={comboCount} onChange={(e) => setComboCount(Number(e.target.value))}>
            <option value={5}>5 Looks</option>
            <option value={10}>10 Looks</option>
          </select>
        </div>

        <button
          className="pill-btn"
          style={{ padding: '8px 12px', background: '#f43f5e', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: '800', fontSize: '11.5px', height: '34px', whiteSpace: 'nowrap' }}
          onClick={() => fetchCombos(false, true)}
          disabled={loading}
        >
          {loading ? 'Curating...' : '⚡ Generate'}
        </button>
      </div>

      {/* Interstitial Loading Screen */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '36px 16px', background: t.card, borderRadius: '16px', border: `1px solid ${t.border}`, marginBottom: '14px', width: '100%' }}>
          <div style={{ width: '42px', height: '42px', border: '3px solid #f43f5e33', borderTopColor: '#f43f5e', borderRadius: '50%', margin: '0 auto 14px auto', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '14px', fontWeight: '800', color: '#f43f5e', margin: '0 0 6px 0', lineHeight: '1.3' }}>
            {interstitialTexts[interstitialStep]}
          </p>
          <p style={{ fontSize: '11.5px', color: t.muted, margin: '0 0 14px 0' }}>
            AI Stylist Studio is matching color contrast, fit, and proportional store prices.
          </p>
          <div style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '10px', maxWidth: '340px', margin: '0 auto' }}>
            <span style={{ fontSize: '9.5px', color: '#f59e0b', fontWeight: '800' }}>PARTNER SPOTLIGHT</span>
            <p style={{ fontSize: '11.5px', fontWeight: '600', margin: '3px 0 0 0' }}>
              Applying verified discount coupons on Amazon, Myntra, and Ajio.
            </p>
          </div>
        </div>
      )}

      {/* SWIPE DECK VIEW */}
      {!loading && viewMode === 'swipe' && combos.length > 0 && (
        <div style={{ width: '100%' }}>
          {/* Progress Indicators */}
          <div style={{ display: 'flex', gap: '3px', marginBottom: '8px', width: '100%' }}>
            {combos.map((_, i) => (
              <div
                key={i}
                onClick={() => setActiveIndex(i)}
                style={{ flex: 1, height: '3px', borderRadius: '99px', background: i === activeIndex ? '#f43f5e' : i < activeIndex ? '#f43f5e66' : t.border, cursor: 'pointer' }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '11px', color: t.muted }}>
            <span>Look <strong>{activeIndex + 1}</strong> of <strong>{combos.length}</strong> (Swipe card left/right)</span>
            <button onClick={() => setViewMode('grid')} style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              Grid Feed →
            </button>
          </div>

          {renderOutfitCard(combos[activeIndex] || combos[0], activeIndex, true)}

          {/* Floating Action Dock (Positioned above home bar with safe spacing) */}
          <div style={{ position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)', background: theme === 'dark' ? 'rgba(20, 20, 25, 0.94)' : 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(12px)', border: `1px solid ${t.border}`, borderRadius: '99px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 60, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', maxWidth: '90vw' }}>
            <button className="pill-btn" onClick={() => handleSwipeCard('prev')} style={{ background: t.inner, color: t.text, border: `1px solid ${t.border}`, padding: '7px 11px', borderRadius: '99px', cursor: 'pointer', fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap' }}>
              ← Prev
            </button>
            <button className="pill-btn" onClick={() => handleSwipeCard('like')} style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '7px 15px', borderRadius: '99px', cursor: 'pointer', fontWeight: '800', fontSize: '11.5px', boxShadow: '0 4px 14px rgba(244,63,94,0.4)', whiteSpace: 'nowrap' }}>
              ❤️ Love
            </button>
            <button className="pill-btn" onClick={() => handleSwipeCard('next')} style={{ background: theme === 'dark' ? '#fafafa' : '#0f172a', color: theme === 'dark' ? '#09090b' : '#fafafa', border: 'none', padding: '7px 15px', borderRadius: '99px', cursor: 'pointer', fontWeight: '800', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* GRID FEED VIEW */}
      {!loading && viewMode === 'grid' && combos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          {combos.map((combo, idx) => (
            <div key={idx} style={{ width: '100%' }}>
              {renderOutfitCard(combo, idx, false)}
              {idx === 2 && (
                <div style={{ marginTop: '14px', background: 'linear-gradient(90deg, #f59e0b15, #f43f5e15)', border: '1px dashed #f59e0b88', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '9.5px', color: '#f59e0b', fontWeight: '800' }}>SPONSORED SPOTLIGHT</span>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', fontWeight: '600' }}>
                    Shop curated festive collections directly on Myntra & Ajio with verified discounts.
                  </p>
                </div>
              )}
            </div>
          ))}
          <button className="pill-btn" onClick={() => fetchCombos(true, true)} disabled={loadingMore} style={{ width: '100%', padding: '13px', background: t.card, color: t.text, border: `1px solid ${t.border}`, borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            {loadingMore ? 'Loading More Looks...' : '➕ Load 5 More Looks'}
          </button>
        </div>
      )}

      {/* SAVED CLOSET VIEW */}
      {viewMode === 'closet' && (
        <div style={{ width: '100%' }}>
          {savedCloset.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', background: t.card, borderRadius: '16px', border: `1px solid ${t.border}`, width: '100%' }}>
              <p style={{ fontSize: '14.5px', fontWeight: '700', margin: '0 0 4px 0' }}>Your Saved Closet is Empty 🤍</p>
              <p style={{ fontSize: '12px', color: t.muted, margin: '0 0 14px 0' }}>Tap "Save" or "Love" on any look to build your personal lookbook.</p>
              <button onClick={() => setViewMode('swipe')} style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                Back to Swipe Deck
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              {savedCloset.map((combo, idx) => renderOutfitCard(combo, idx, false))}
            </div>
          )}
        </div>
      )}

      {/* ON-SITE AEO/GEO MICRO-COPY FAQ ACCORDION */}
      <div style={{ marginTop: '30px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '14px', width: '100%' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '800' }}>Frequently Asked Style Questions</h4>
        <details style={{ marginBottom: '6px', cursor: 'pointer' }}>
          <summary style={{ fontSize: '12px', fontWeight: '600', color: t.text }}>How does StyleAI match clothes to Indian skin undertones?</summary>
          <p style={{ fontSize: '11.5px', color: t.muted, margin: '5px 0 0 0', lineHeight: '1.4' }}>
            Our algorithmic stylist pairs seasonal color theory for wheatish, dusky, and fair Indian skin tones with high-contrast jewel shades and earthy neutrals.
          </p>
        </details>
        <details style={{ cursor: 'pointer' }}>
          <summary style={{ fontSize: '12.5px', fontWeight: '600', color: t.text }}>Can I style single-piece garments like Sarees and Dresses?</summary>
          <p style={{ fontSize: '11.5px', color: t.muted, margin: '5px 0 0 0', lineHeight: '1.4' }}>
            Yes. Our smart category logic automatically adapts the 4 slots for Sarees, Kurta Sets, and Dresses without generating unnecessary bottomwear.
          </p>
        </details>
      </div>

      {/* VIRTUAL TRY-ON SPEC SHEET MODAL */}
      {aiModalData && (
        <div onClick={() => setAiModalData(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '10px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '18px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '16px', color: t.text, boxShadow: '0 24px 48px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#f43f5e', fontWeight: '700', textTransform: 'uppercase' }}>
                  Virtual Try-On • {aiModalData.combo.ensemble_type}
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '700' }}>{aiModalData.combo.look_name}</h3>
              </div>
              <button onClick={() => setAiModalData(null)} style={{ background: t.inner, color: t.muted, border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '13px' }}>✕</button>
            </div>

            <div style={{ background: t.inner, borderRadius: '10px', padding: '8px', border: `1px solid ${t.border}`, marginBottom: '10px' }}>
              {generatingSnapshot ? (
                <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: '12px' }}>
                  Preparing spec card...
                </div>
              ) : aiModalData.screenshotDataUrl ? (
                <img src={aiModalData.screenshotDataUrl} alt="Virtual Try-On Spec Card" style={{ width: '100%', borderRadius: '6px', display: 'block' }} />
              ) : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <button
                className="pill-btn"
                onClick={handleCopyBoth}
                style={{ gridColumn: '1 / -1', padding: '10px', background: copiedState === 'both' ? '#10b981' : (theme === 'dark' ? '#fafafa' : '#0f172a'), color: copiedState === 'both' ? '#fff' : (theme === 'dark' ? '#09090b' : '#fafafa'), border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer' }}
              >
                {copiedState === 'both' ? '✓ Image + Master Prompt Copied!' : '✨ Copy Both (Image + Master Prompt)'}
              </button>

              <button className="pill-btn" onClick={handleCopyImageOnly} style={{ padding: '8px', background: t.inner, color: copiedState === 'image' ? '#4ade80' : t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>
                {copiedState === 'image' ? '✓ Image Copied' : '🖼️ Copy Image Only'}
              </button>

              <button className="pill-btn" onClick={handleCopyPromptOnly} style={{ padding: '8px', background: t.inner, color: copiedState === 'prompt' ? '#4ade80' : t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>
                {copiedState === 'prompt' ? '✓ Prompt Copied' : '📋 Copy Prompt Only'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '6px', marginBottom: '12px' }}>
              <button className="pill-btn" onClick={handleNativeMobileShare} style={{ padding: '9px', background: '#10b98118', color: '#34d399', border: '1px solid #10b98144', borderRadius: '8px', fontWeight: '700', fontSize: '11.5px', cursor: 'pointer' }}>
                📲 Send to Mobile AI
              </button>
              <button className="pill-btn" onClick={handleDownloadImage} style={{ padding: '9px', background: t.inner, color: t.muted, border: `1px solid ${t.border}`, borderRadius: '8px', fontWeight: '600', fontSize: '11.5px', cursor: 'pointer' }}>
                {copiedState === 'saved' ? '✓ Saved PNG' : '⬇️ Save PNG'}
              </button>
            </div>

            <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: t.muted, fontWeight: '600' }}>
              Open directly in your AI App:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {[
                { id: 'chatgpt', label: 'ChatGPT', bg: '#10a37f' },
                { id: 'gemini', label: 'Gemini', bg: '#2563eb' },
                { id: 'grok', label: 'Grok', bg: '#27272a' },
                { id: 'copilot', label: 'Copilot', bg: '#7c3aed' }
              ].map(app => (
                <button key={app.id} className="pill-btn" onClick={() => launchAiApp(app.id)} style={{ background: app.bg, color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 4px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}>
                  {app.label} ↗
                </button>
              ))}
            </div>

            <details style={{ background: '#09090b', borderRadius: '8px', border: `1px solid ${t.border}`, padding: '8px' }}>
              <summary style={{ fontSize: '11.5px', color: t.muted, cursor: 'pointer', fontWeight: '600' }}>
                View Master Try-On Prompt
              </summary>
              <textarea readOnly value={aiModalData.masterPrompt} style={{ width: '100%', height: '90px', marginTop: '6px', background: 'transparent', color: '#d4d4d8', border: 'none', fontSize: '11px', fontFamily: 'monospace', resize: 'none', outline: 'none' }} />
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
