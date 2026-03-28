'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAdminAuthToken } from '@/lib/admin/api'
import { GROWTH_STAGES, getCurrentStage, getStageProgress, CONTENT_PLATFORM_SPECS, type GrowthStage } from '@/lib/content-strategy'
import { getMediaLibrary, findMatchingMedia, type MediaItem } from '@/lib/media-library'
import MediaLibrary from '@/components/admin/MediaLibrary'
import { SparklesIcon, CheckCircleIcon, PhotoIcon, XMarkIcon as XIcon, ClipboardDocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function ContentStrategy() {
  const [userCount, setUserCount] = useState<number>(0)
  const [loadingCount, setLoadingCount] = useState(true)
  const [totalAccounts, setTotalAccounts] = useState(0)
  const [testAccountCount, setTestAccountCount] = useState(10) // default: all current accounts are test
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [loadingChecklist, setLoadingChecklist] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [ideas, setIdeas] = useState<any>(null)

  const stage = getCurrentStage(userCount)
  const progress = getStageProgress(userCount, stage)

  // Load user count
  useEffect(() => {
    const loadCount = async () => {
      try {
        const token = await getAdminAuthToken()
        const res = await fetch('/api/admin/users/count', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const total = data.count || 0
          setTotalAccounts(total)
          // Load saved test account count from localStorage
          const savedTestCount = parseInt(localStorage.getItem('wpl_test_account_count') || '0', 10)
          if (savedTestCount > 0) setTestAccountCount(savedTestCount)
          setUserCount(Math.max(0, total - (savedTestCount || testAccountCount)))
        }
      } catch {
        // ignore
      } finally {
        setLoadingCount(false)
      }
    }
    loadCount()
  }, [])

  // Load checklist progress from Firestore
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const docRef = doc(db, 'admin', 'marketing_progress')
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setCheckedItems(snap.data() || {})
        }
      } catch (err) {
        console.error('Failed to load checklist:', err)
      } finally {
        setLoadingChecklist(false)
      }
    }
    loadProgress()
  }, [])

  const toggleCheckItem = async (itemId: string) => {
    const updated = { ...checkedItems, [itemId]: !checkedItems[itemId] }
    setCheckedItems(updated)
    try {
      const docRef = doc(db, 'admin', 'marketing_progress')
      await setDoc(docRef, updated, { merge: true })
    } catch {
      toast.error('Failed to save progress')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setIdeas(null)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch('/api/admin/marketing/content-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userCount }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        console.error('Content generation failed:', data)
        throw new Error(data.error || 'Failed to generate')
      }
      console.log('Generated ideas:', data.ideas)
      setIdeas(data.ideas)
      toast.success('Content ideas generated!')
    } catch {
      toast.error('Failed to generate content ideas')
    } finally {
      setGenerating(false)
    }
  }

  const [selectedImages, setSelectedImages] = useState<Record<string, MediaItem>>({})
  const [showMediaPicker, setShowMediaPicker] = useState<string | null>(null)
  const [mediaLibraryItems, setMediaLibraryItems] = useState<MediaItem[]>([])

  useEffect(() => {
    getMediaLibrary().then(setMediaLibraryItems).catch(() => {})
  }, [])

  const handleSelectImage = (key: string, item: MediaItem) => {
    setSelectedImages(prev => ({ ...prev, [key]: item }))
    setShowMediaPicker(null)
  }

  const handleRemoveImage = (key: string) => {
    setSelectedImages(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
  }

  const handleDownloadImage = (item: MediaItem) => {
    const a = document.createElement('a')
    a.href = item.url
    a.download = item.filename || 'wpl-image.jpg'
    a.target = '_blank'
    a.click()
    toast.success('Image download started')
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard')).catch(() => toast.error('Failed to copy'))
  }

  const stageColor = (s: GrowthStage) => {
    const colors: Record<string, string> = {
      orange: 'bg-orange-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
    }
    return colors[s.color] || 'bg-gray-500'
  }

  const stageTextColor = (s: GrowthStage) => {
    const colors: Record<string, string> = {
      orange: 'text-orange-600',
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
    }
    return colors[s.color] || 'text-gray-600'
  }

  const stageBgLight = (s: GrowthStage) => {
    const colors: Record<string, string> = {
      orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    }
    return colors[s.color] || ''
  }

  const completedCount = stage.checklist.filter(item => checkedItems[item.id]).length

  return (
    <div className="space-y-8">
      {/* Stage Banner */}
      <div className={`rounded-xl border-2 p-6 ${stageBgLight(stage)}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-bold ${stageTextColor(stage)}`}>{stage.name}</h2>
            <p className="text-muted-foreground mt-1">{stage.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-foreground">{userCount}</div>
            <div className="text-sm text-muted-foreground">real users</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <span>{totalAccounts} total</span>
              <span>-</span>
              <input
                type="number"
                value={testAccountCount}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0)
                  setTestAccountCount(val)
                  setUserCount(Math.max(0, totalAccounts - val))
                  localStorage.setItem('wpl_test_account_count', String(val))
                }}
                className="w-12 px-1 py-0.5 border border-border rounded text-center text-xs bg-background"
                min={0}
              />
              <span>test</span>
            </div>
          </div>
        </div>

        {/* Progress bar with milestones */}
        <div className="relative">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${stageColor(stage)} rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {GROWTH_STAGES.map((s) => (
              <span key={s.id} className={stage.id === s.id ? `font-bold ${stageTextColor(s)}` : ''}>
                {s.range[0] === 0 ? '0' : s.range[0]}
              </span>
            ))}
            <span>100+</span>
          </div>
        </div>
      </div>

      {/* Action Checklist */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Action Checklist</h3>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{stage.checklist.length} completed
          </span>
        </div>

        {loadingChecklist ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {stage.checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!checkedItems[item.id]}
                  onChange={() => toggleCheckItem(item.id)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <span className={checkedItems[item.id] ? 'line-through text-muted-foreground' : 'text-foreground'}>
                    {item.text}
                  </span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    item.category === 'outreach' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    item.category === 'content' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    item.category === 'feedback' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    item.category === 'conversion' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {item.category}
                  </span>
                </div>
                {checkedItems[item.id] && <CheckCircleIcon className="h-5 w-5 text-green-500 mt-1" />}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* AI Content Generator */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">AI Content Generator</h3>
            <p className="text-sm text-muted-foreground">
              Generate content ideas tailored to your current stage and caregiver ICP
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate Ideas
              </>
            )}
          </button>
        </div>

        {ideas && (
          <div className="space-y-6 mt-6">
            {/* YouTube Shorts */}
            {(ideas.shorts || ideas.videos) && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">
                  YouTube {ideas.shorts ? 'Shorts' : 'Videos'}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {ideas.shorts ? '9:16 • 1080x1920 • 30-40s' : '16:9 • 1920x1080 • 5-10min'}
                  </span>
                </h4>
                <div className="space-y-3">
                  {(ideas.shorts || ideas.videos || []).map((item: any, i: number) => (
                    <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="font-medium text-foreground mb-1">{item.title}</div>
                      {item.hook && <div className="text-sm text-red-700 dark:text-red-300 mb-1">Hook: {item.hook}</div>}
                      <div className="text-sm text-muted-foreground">{item.script || item.outline}</div>
                      {item.cta && <div className="text-sm font-medium text-red-600 dark:text-red-400 mt-1">CTA: {item.cta}</div>}
                      {item.hashtags && item.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.hashtags.map((tag: string, j: number) => (
                            <span key={j} className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                              {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.keywords.map((kw: string, j: number) => (
                            <span key={j} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Posts */}
            {ideas.posts && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Social Media Posts</h4>
                <div className="space-y-4">
                  {ideas.posts.map((item: any, i: number) => (
                    <div key={i} className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{item.platform}</span>
                          {item.aspectRatio && (
                            <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{item.aspectRatio}</span>
                          )}
                        </div>
                        <button
                          onClick={() => { setShowMediaPicker(`post-${i}`); setPickerPostData(item) }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <PhotoIcon className="h-3.5 w-3.5" />
                          {selectedImages[`post-${i}`] ? 'Change Image' : 'Attach Image'}
                        </button>
                      </div>

                      {/* Composed Image Preview */}
                      {/* Selected Image — raw, no text overlay */}
                      {selectedImages[`post-${i}`] && (
                        <div className="mb-3 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                          <img
                            src={selectedImages[`post-${i}`].url}
                            alt="Selected media"
                            className="w-full max-h-64 object-cover"
                          />
                          <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20">
                            <span className="text-xs text-muted-foreground">{selectedImages[`post-${i}`].tags.join(', ')}</span>
                            <div className="flex gap-2">
                              <button onClick={() => handleRemoveImage(`post-${i}`)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Remove</button>
                              <button onClick={() => handleDownloadImage(selectedImages[`post-${i}`])} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium">
                                <ArrowDownTrayIcon className="h-3 w-3" /> Download
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Suggested Images from Library */}
                      {!selectedImages[`post-${i}`] && mediaLibraryItems.length > 0 && (item.keywords || item.hashtags) && (
                        <div className="mb-3">
                          <div className="text-xs text-muted-foreground mb-1">Suggested from your library:</div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {findMatchingMedia(mediaLibraryItems, item.keywords || item.hashtags || []).slice(0, 4).map(media => (
                              <img
                                key={media.id}
                                src={media.url}
                                alt={media.filename}
                                onClick={() => handleSelectImage(`post-${i}`, media)}
                                className="h-16 w-16 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-primary transition-colors flex-shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Caption — copyable */}
                      <div className="relative group/caption">
                        <div className="text-sm text-foreground mb-2 whitespace-pre-line">{item.caption || item.text}</div>
                        <button
                          onClick={() => handleCopyText((item.caption || item.text || '') + '\n\n' + (item.hashtags || []).map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' '))}
                          className="absolute top-0 right-0 opacity-0 group-hover/caption:opacity-100 flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs transition-opacity"
                        >
                          <ClipboardDocumentIcon className="h-3 w-3" /> Copy All
                        </button>
                      </div>
                      {(item.imagePrompt || item.imageDescription) && (
                        <div className="relative group/imgprompt bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-2">
                          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Whisk Prompt ({item.aspectRatio || '1:1'}):</div>
                          <div className="text-xs text-purple-800 dark:text-purple-300">{item.imagePrompt || item.imageDescription}</div>
                          <button
                            onClick={() => handleCopyText(item.imagePrompt || item.imageDescription || '')}
                            className="absolute top-2 right-2 opacity-0 group-hover/imgprompt:opacity-100 flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded text-xs transition-opacity"
                          >
                            <ClipboardDocumentIcon className="h-3 w-3" /> Copy
                          </button>
                        </div>
                      )}
                      {item.hashtags && item.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.hashtags.map((tag: string, j: number) => (
                            <span key={j} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.keywords.map((kw: string, j: number) => (
                            <span key={j} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loom / Outreach */}
            {(ideas.looms || ideas.partnerships) && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">{ideas.looms ? 'Loom Outreach Scripts' : 'Partnership Outreach'}</h4>
                <div className="space-y-3">
                  {(ideas.looms || ideas.partnerships || []).map((item: any, i: number) => (
                    <div key={i} className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="font-medium text-foreground mb-1">{item.subject || item.target}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-line">{item.script || item.pitch}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community Posts */}
            {ideas.community && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Community Posts</h4>
                <div className="space-y-3">
                  {ideas.community.map((item: any, i: number) => (
                    <div key={i} className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <div className="font-medium text-foreground mb-1">{item.title}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-line">{item.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emails */}
            {ideas.emails && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Email Templates</h4>
                <div className="space-y-3">
                  {ideas.emails.map((item: any, i: number) => (
                    <div key={i} className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">{item.purpose}</div>
                      <div className="font-medium text-foreground mb-1">Subject: {item.subject}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-line">{item.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case Studies */}
            {ideas.caseStudies && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Case Study Outlines</h4>
                <div className="space-y-3">
                  {ideas.caseStudies.map((item: any, i: number) => (
                    <div key={i} className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                      <div className="font-medium text-foreground mb-2">{item.title}</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div><strong>Problem:</strong> {item.problem}</div>
                        <div><strong>Solution:</strong> {item.solution}</div>
                        <div><strong>Results:</strong> {item.results}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blogs */}
            {ideas.blogs && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Blog Post Ideas</h4>
                <div className="space-y-3">
                  {ideas.blogs.map((item: any, i: number) => (
                    <div key={i} className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
                      <div className="font-medium text-foreground mb-1">{item.title}</div>
                      <div className="text-xs text-teal-600 dark:text-teal-400 mb-1">Target keyword: {item.targetKeyword}</div>
                      <div className="text-sm text-muted-foreground">{item.outline}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Headlines */}
            {ideas.headlines && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">A/B Test Headlines</h4>
                <div className="space-y-3">
                  {ideas.headlines.map((item: any, i: number) => (
                    <div key={i} className="bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                      <div className="font-medium text-foreground mb-1">"{item.variant}"</div>
                      <div className="text-sm text-muted-foreground">{item.reasoning}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ads */}
            {ideas.ads && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Paid Ad Copy</h4>
                <div className="space-y-4">
                  {ideas.ads.map((item: any, i: number) => (
                    <div key={i} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">{item.platform}</span>
                          {item.aspectRatio && (
                            <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">{item.aspectRatio}</span>
                          )}
                        </div>
                        <button
                          onClick={() => setShowMediaPicker(`ad-${i}`)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <PhotoIcon className="h-3.5 w-3.5" />
                          {selectedImages[`ad-${i}`] ? 'Change Image' : 'Attach Image'}
                        </button>
                      </div>

                      {/* Selected Ad Image — raw */}
                      {selectedImages[`ad-${i}`] && (
                        <div className="mb-3 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                          <img src={selectedImages[`ad-${i}`].url} alt="Selected media" className="w-full max-h-64 object-cover" />
                          <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20">
                            <span className="text-xs text-muted-foreground">{selectedImages[`ad-${i}`].tags.join(', ')}</span>
                            <div className="flex gap-2">
                              <button onClick={() => handleRemoveImage(`ad-${i}`)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Remove</button>
                              <button onClick={() => handleDownloadImage(selectedImages[`ad-${i}`])} className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium">
                                <ArrowDownTrayIcon className="h-3 w-3" /> Download
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ad copy — copyable */}
                      <div className="relative group/adcopy">
                        <div className="font-medium text-foreground mb-1">{item.headline}</div>
                        <div className="text-sm text-muted-foreground">{item.body}</div>
                        <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1">CTA: {item.cta}</div>
                        <button
                          onClick={() => handleCopyText(`${item.headline}\n\n${item.body}\n\n${item.cta}\n\n${(item.hashtags || []).map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' ')}`)}
                          className="absolute top-0 right-0 opacity-0 group-hover/adcopy:opacity-100 flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded text-xs transition-opacity"
                        >
                          <ClipboardDocumentIcon className="h-3 w-3" /> Copy All
                        </button>
                      </div>
                      {item.imageDescription && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">Image idea: {item.imageDescription}</div>
                      )}
                      {item.hashtags && item.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.hashtags.map((tag: string, j: number) => (
                            <span key={j} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                              {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standalone Image Prompts for Whisk */}
            {ideas.imagePrompts && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Image Prompts for Whisk (Batch Generation)</h4>
                <p className="text-xs text-muted-foreground mb-3">Copy these prompts into Whisk to generate images. Upload results to your Media Library.</p>
                <div className="space-y-3">
                  {ideas.imagePrompts.map((item: any, i: number) => (
                    <div key={i} className="relative group/whisk bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{item.aspectRatio}</span>
                        {item.scene && <span className="text-xs text-muted-foreground">{item.scene}</span>}
                      </div>
                      <div className="text-sm text-purple-800 dark:text-purple-300">{item.prompt}</div>
                      <button
                        onClick={() => handleCopyText(item.prompt)}
                        className="absolute top-3 right-3 opacity-0 group-hover/whisk:opacity-100 flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded text-xs transition-opacity"
                      >
                        <ClipboardDocumentIcon className="h-3 w-3" /> Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly Calendar */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Weekly Content Calendar</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Recommended posting schedule for {stage.name}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stage.calendarTemplate.map((slot, i) => (
            <div key={i} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground">{slot.day}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  slot.platform === 'YouTube' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                  slot.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  slot.platform === 'Twitter' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' :
                  slot.platform === 'Reddit' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                  slot.platform === 'Loom' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                  slot.platform === 'Email' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  slot.platform === 'Pinterest' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                  slot.platform === 'Blog' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                  slot.platform === 'Ads' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {slot.platform}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{slot.activity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* All Stages Overview */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Growth Roadmap</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {GROWTH_STAGES.map((s) => (
            <div
              key={s.id}
              className={`rounded-lg border-2 p-4 ${
                stage.id === s.id
                  ? `${stageBgLight(s)} border-current`
                  : 'border-border opacity-60'
              }`}
            >
              <div className={`font-bold mb-1 ${stage.id === s.id ? stageTextColor(s) : 'text-muted-foreground'}`}>
                {s.name}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {s.range[0] === 0 ? '0' : s.range[0]}-{s.range[1] === Infinity ? '100+' : s.range[1]} users
              </div>
              <div className="text-xs text-muted-foreground">{s.checklist.length} action items</div>
              {stage.id === s.id && (
                <div className="text-xs font-medium text-foreground mt-1">
                  You are here
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMediaPicker(null)}>
          <div className="bg-card rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Select Image from Library</h3>
              <button onClick={() => setShowMediaPicker(null)} className="p-2 hover:bg-muted rounded-lg">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <MediaLibrary
              selectionMode
              onSelect={(item) => handleSelectImage(showMediaPicker, item)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
