'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Button,
  Spin,
  App,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  Empty,
  Tooltip,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import {
  TreePine,
  LogOut,
  User,
  Plus,
  Link2,
  Filter,
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
  Image as ImageIcon,
  Layers,
  RotateCcw,
  Minus,
  BookOpen,
  Send,
} from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { familyApi, relationshipApi } from '@/lib/api/family'
import {
  User as UserType,
  ApiError,
  FamilyRelative,
  FamilyRelationship,
  FamilyRelativeCreate,
  FamilyRelationshipCreate,
} from '@/types'
import { isAuthenticated, clearAuthTokens, getErrorMessage, getProxiedImageUrl } from '@/lib/utils'
import dayjs from 'dayjs'
import RelativeCard from '@/components/tree/RelativeCard'
import { RELATIONSHIP_LABELS } from '@/components/tree/ConnectionLine'
import InvitationModal from '@/components/family/InvitationModal'
import { hierarchy, tree as d3Tree } from 'd3-hierarchy'

// Gender labels
const GENDER_LABELS: Record<string, string> = {
  male: 'Мужской',
  female: 'Женский',
  other: 'Другой',
}

// Card dimensions for positioning
const CARD_WIDTH = 208
const CARD_HEIGHT = 280
const HORIZONTAL_GAP = 60  // Reduced spacing
const VERTICAL_GAP = 100    // Reduced vertical spacing
const EDGE_PAD = 6

// Relationship colors - unique colors for different relationship types
const RELATIONSHIP_COLORS: Record<string, string> = {
  // Parents (green tones)
  father: '#22c55e',
  mother: '#4ade80',
  parent: '#16a34a',
  stepfather: '#86efac',
  stepmother: '#bbf7d0',
  // Children (blue tones)
  son: '#3b82f6',
  daughter: '#60a5fa',
  child: '#2563eb',
  stepson: '#93c5fd',
  stepdaughter: '#bfdbfe',
  // Siblings (purple tones)
  brother: '#8b5cf6',
  sister: '#a78bfa',
  half_brother: '#c4b5fd',
  half_sister: '#ddd6fe',
  // Spouse (red/pink tones)
  husband: '#ef4444',
  wife: '#f87171',
  partner: '#fb923c',
  // Grandparents (amber tones)
  grandfather: '#f59e0b',
  grandmother: '#fbbf24',
  // Grandchildren (cyan tones)
  grandson: '#06b6d4',
  granddaughter: '#22d3ee',
  // Extended family (various)
  uncle: '#6366f1',
  aunt: '#818cf8',
  nephew: '#14b8a6',
  niece: '#2dd4bf',
  cousin: '#ec4899',
  // In-laws (slate tones)
  father_in_law: '#64748b',
  mother_in_law: '#94a3b8',
  son_in_law: '#475569',
  daughter_in_law: '#cbd5e1',
  brother_in_law: '#334155',
  sister_in_law: '#e2e8f0',
  // Godparents (indigo)
  godfather: '#4f46e5',
  godmother: '#6366f1',
  godson: '#7c3aed',
  goddaughter: '#8b5cf6',
  // Other
  guardian: '#d946ef',
  ward: '#e879f9',
  unknown: '#ff6b35',
}


const PARENT_TYPES = new Set([
  'father',
  'mother',
  'parent',
  'stepfather',
  'stepmother',
  'guardian',
])

const SPOUSE_TYPES = new Set(['husband', 'wife', 'partner', 'spouse'])
const SIBLING_TYPES = new Set(['brother', 'sister', 'half_brother', 'half_sister', 'sibling'])
const MIN_NODE_GAP = 48

interface NodePosition {
  relative: FamilyRelative
  x: number
  y: number
}

const applyCollisionSpacing = (nodes: NodePosition[]) => {
  if (nodes.length === 0) return nodes
  const byGen = new Map<number, NodePosition[]>()
  nodes.forEach((n) => {
    const gen = n.relative.generation ?? 0
    if (!byGen.has(gen)) byGen.set(gen, [])
    byGen.get(gen)!.push({ ...n })
  })
  const adjusted = new Map<number, NodePosition>()
  byGen.forEach((arr) => {
    const sorted = [...arr].sort((a, b) => a.x - b.x)
    let cursor = -Infinity
    sorted.forEach((node) => {
      let x = node.x
      if (x < cursor) x = cursor
      cursor = x + CARD_WIDTH + MIN_NODE_GAP
      adjusted.set(node.relative.id, { ...node, x })
    })
  })
  return nodes.map((n) => adjusted.get(n.relative.id) ?? n)
}

// Calculate age from birth date
function calculateAge(birthDate: string, deathDate?: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const end = deathDate ? new Date(deathDate) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const monthDiff = end.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export default function TreePage() {
  const router = useRouter()
  const { message, modal } = App.useApp()
  const containerRef = useRef<HTMLDivElement>(null)

  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatives, setRelatives] = useState<FamilyRelative[]>([])
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([])

  // View state
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([])
  const [manualPositions, setManualPositions] = useState<Record<number, { x: number; y: number }>>({})
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null)
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const hasUserPanned = useRef(false)
  const autoCentered = useRef(false)

  // Modal state
  const [addRelativeModal, setAddRelativeModal] = useState(false)
  const [addRelationshipModal, setAddRelationshipModal] = useState(false)
  const [editRelativeModal, setEditRelativeModal] = useState(false)
  const [storiesModal, setStoriesModal] = useState(false)
  const [invitationModal, setInvitationModal] = useState(false)
  const [selectedRelative, setSelectedRelative] = useState<FamilyRelative | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // Stories state (key-value pairs)
  const [stories, setStories] = useState<Array<{ key: string; value: string }>>([])
  const [newStoryKey, setNewStoryKey] = useState('')
  const [newStoryValue, setNewStoryValue] = useState('')
  const [viewingStory, setViewingStory] = useState<{ key: string; value: string } | null>(null)

  // Filter state
  const [filterGender, setFilterGender] = useState<string | null>(null)
  const [filterGeneration, setFilterGeneration] = useState<number | null>(null)
  const [filterAlive, setFilterAlive] = useState<boolean | null>(null)
  const [filterHasStories, setFilterHasStories] = useState<boolean | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showConnections, setShowConnections] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [relationshipForm] = Form.useForm()

  // Auto-рецентрирование после смены фильтров/поиска
  useEffect(() => {
    autoCentered.current = false
    hasUserPanned.current = false
  }, [filterGender, filterGeneration, filterAlive, filterHasStories, searchTerm, relatives.length, relationships.length])

  // Get unique generations from relatives
  const uniqueGenerations = Array.from(
    new Set(relatives.map((r) => r.generation).filter((g): g is number => g !== null && g !== undefined))
  ).sort((a, b) => a - b)

  const generationLabels = useMemo(() => {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV']
    return uniqueGenerations.reduce((acc, gen, idx) => {
      acc.set(gen, { order: idx + 1, roman: romans[idx] || String(idx + 1) })
      return acc
    }, new Map<number, { order: number; roman: string }>())
  }, [uniqueGenerations])
  const generationOptions = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7]

  const canvasMetrics = useMemo(() => {
    if (nodePositions.length === 0) {
      return {
        originX: -1200,
        originY: -900,
        width: 3200,
        height: 2600,
        contentMinX: 0,
        contentMaxX: CARD_WIDTH,
        contentMinY: 0,
        contentMaxY: CARD_HEIGHT,
      }
    }
    const padding = 1000
    const minX = Math.min(...nodePositions.map((n) => n.x))
    const maxX = Math.max(...nodePositions.map((n) => n.x + CARD_WIDTH))
    const minY = Math.min(...nodePositions.map((n) => n.y))
    const maxY = Math.max(...nodePositions.map((n) => n.y + CARD_HEIGHT))
    return {
      originX: minX - padding,
      originY: minY - padding,
      width: Math.max(maxX - minX + padding * 2, 3200),
      height: Math.max(maxY - minY + padding * 2, 2600),
      contentMinX: minX,
      contentMaxX: maxX,
      contentMinY: minY,
      contentMaxY: maxY,
    }
  }, [nodePositions])

  const toCanvasX = useCallback((x: number) => x - canvasMetrics.originX, [canvasMetrics.originX])
  const toCanvasY = useCallback((y: number) => y - canvasMetrics.originY, [canvasMetrics.originY])

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return null
      return {
        x: (clientX - rect.left - offset.x) / scale + canvasMetrics.originX,
        y: (clientY - rect.top - offset.y) / scale + canvasMetrics.originY,
      }
    },
    [offset.x, offset.y, scale, canvasMetrics.originX, canvasMetrics.originY]
  )

  const mounted = useRef(false)

  // Fetch data
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const fetchData = async () => {
      try {
        const userData = await authApi.me()
        setUser(userData)

        const [relativesData, relationshipsData] = await Promise.all([
          familyApi.getRelatives(userData.id),
          relationshipApi.getRelationships(userData.id, true),
        ])

        setRelatives(relativesData)
        setRelationships(relationshipsData)
      } catch (error) {
        const apiError = error as ApiError
        const errorMessage = getErrorMessage(apiError)
        if (apiError.status === 401) {
          router.push('/auth')
        } else {
          message.error(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  // Calculate node positions using d3-tree (hierarchical layout) with generation-aware Y
  useEffect(() => {
    if (relatives.length === 0) {
      setNodePositions([])
      return
    }

    // Filter relatives
    const filteredRelatives = relatives.filter((r) => {
      if (filterGender && r.gender !== filterGender) return false
      if (filterGeneration !== null && r.generation !== filterGeneration) return false
      if (filterAlive === true && r.death_date) return false
      if (filterAlive === false && !r.death_date) return false
      if (filterHasStories === true) {
        const hasStories = r.context && Object.keys(r.context).length > 0
        if (!hasStories) return false
      }
      if (filterHasStories === false) {
        const hasStories = r.context && Object.keys(r.context).length > 0
        if (hasStories) return false
      }
      if (searchTerm) {
        const fullName = `${r.first_name} ${r.last_name} ${r.middle_name || ''}`.toLowerCase()
        if (!fullName.includes(searchTerm.toLowerCase())) return false
      }
      return true
    })

    if (filteredRelatives.length === 0) {
      setNodePositions([])
      return
    }

    // Map relatives for quick access
    const relMap = new Map<number, FamilyRelative>()
    filteredRelatives.forEach((r) => relMap.set(r.id, r))

    // Build parent -> children map from relationships (only parent-like edges)
    const childrenMap = new Map<number, number[]>()
    relationships.forEach((rel) => {
      if (!PARENT_TYPES.has(rel.relationship_type)) return
      if (!relMap.has(rel.from_relative_id) || !relMap.has(rel.to_relative_id)) return
      if (!childrenMap.has(rel.from_relative_id)) childrenMap.set(rel.from_relative_id, [])
      childrenMap.get(rel.from_relative_id)!.push(rel.to_relative_id)
    })

    // Determine roots (nodes without parents)
    const hasParent = new Set<number>()
    relationships.forEach((rel) => {
      if (!PARENT_TYPES.has(rel.relationship_type)) return
      if (relMap.has(rel.from_relative_id) && relMap.has(rel.to_relative_id)) {
        hasParent.add(rel.to_relative_id)
      }
    })

    const roots = filteredRelatives.filter((r) => !hasParent.has(r.id))
    const rootNodes = roots.length > 0 ? roots : [filteredRelatives[0]]

    // Build hierarchy (with virtual root if multiple roots)
    const buildNode = (id: number, visited: Set<number>): any => {
      if (visited.has(id)) return null
      visited.add(id)
      const rel = relMap.get(id)
      if (!rel) return null
      const childrenIds = childrenMap.get(id) || []
      return {
        relative: rel,
        children: childrenIds
          .map((cid) => buildNode(cid, visited))
          .filter((c): c is any => !!c),
      }
    }

    let rootData: any
    if (rootNodes.length === 1) {
      rootData = buildNode(rootNodes[0].id, new Set())
    } else {
      rootData = {
        relative: { id: -1 } as FamilyRelative,
        children: rootNodes
          .map((r) => buildNode(r.id, new Set()))
          .filter((c): c is any => !!c),
      }
    }

    if (!rootData) {
      setNodePositions([])
      return
    }

    const root = hierarchy(rootData)
    const treeLayout = d3Tree()
      .nodeSize([CARD_WIDTH + HORIZONTAL_GAP, CARD_HEIGHT + VERTICAL_GAP])
      .separation((a: any, b: any) => (a.parent === b.parent ? 1.1 : 1.4))
    treeLayout(root)

    // Normalize X and recompute Y by generation (to avoid d3 depth jumps)
    let minX = Infinity
    let minGen = Infinity
    root.descendants().forEach((d: any) => {
      if (d.data.relative && d.data.relative.id !== -1) {
        minX = Math.min(minX, d.x)
        if (d.data.relative.generation !== null && d.data.relative.generation !== undefined) {
          minGen = Math.min(minGen, d.data.relative.generation)
        }
      }
    })
    if (!isFinite(minGen)) minGen = 0

    const shiftX = -(minX || 0) + 120
    const layerGap = CARD_HEIGHT + VERTICAL_GAP
    const startY = 60

    const positions: NodePosition[] = []
    root.descendants().forEach((d: any) => {
      if (!d.data.relative || d.data.relative.id === -1) return
      const gen = d.data.relative.generation ?? d.depth
      const y = startY + (gen - minGen) * layerGap
      const manual = manualPositions[d.data.relative.id]
      positions.push({
        relative: d.data.relative,
        x: manual ? manual.x : d.x + shiftX,
        y: manual ? manual.y : y,
      })
    })

    const spaced = applyCollisionSpacing(positions)
    setNodePositions(spaced)
  }, [relatives, relationships, filterGender, filterGeneration, filterAlive, filterHasStories, searchTerm, manualPositions])

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.relative-card, .control-panel, button, .ant-modal')) return
    setIsDragging(true)
    hasUserPanned.current = true
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId !== null) return
    if (!isDragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggingNodeId(null)
  }

  // Auto-center after layout (once, unless пользователь панил)
  useEffect(() => {
    if (autoCentered.current || hasUserPanned.current) return
    if (!containerRef.current || nodePositions.length === 0) return
    const rect = containerRef.current.getBoundingClientRect()
    const minX = canvasMetrics.contentMinX - canvasMetrics.originX
    const maxX = canvasMetrics.contentMaxX - canvasMetrics.originX
    const minY = canvasMetrics.contentMinY - canvasMetrics.originY
    const maxY = canvasMetrics.contentMaxY - canvasMetrics.originY
    const contentW = maxX - minX
    const contentH = maxY - minY
    const ox = (rect.width - contentW) / 2 - minX
    const oy = (rect.height - contentH) / 2 - minY
    setOffset({ x: ox, y: oy })
    autoCentered.current = true
  }, [nodePositions, canvasMetrics])

  const handleWheel = useCallback((e: WheelEvent) => {
    // Prevent default scrolling behavior
    e.preventDefault()
    e.stopPropagation()

    const container = containerRef.current
    if (!container) return

    // Get mouse position relative to container
    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1

    setScale((prevScale) => {
      const newScale = Math.min(Math.max(prevScale * zoomFactor, 0.2), 3)

      // Adjust offset to zoom towards mouse position
      setOffset((prevOffset) => ({
        x: mouseX - (mouseX - prevOffset.x) * (newScale / prevScale),
        y: mouseY - (mouseY - prevOffset.y) * (newScale / prevScale),
      }))

      return newScale
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      // Use passive: false to allow preventDefault
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Node drag handlers (mouse + touch)
  const beginNodeDrag = (clientX: number, clientY: number, nodeId: number) => {
    const world = clientToWorld(clientX, clientY)
    if (!world) return
    const node = nodePositions.find((n) => n.relative.id === nodeId)
    if (!node) return
    setDragStartOffset({ x: world.x - node.x, y: world.y - node.y })
    setDraggingNodeId(nodeId)
    hasUserPanned.current = true
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation()
    e.preventDefault()
    beginNodeDrag(e.clientX, e.clientY, nodeId)
  }

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: number) => {
    const touch = e.touches[0]
    if (!touch) return
    e.stopPropagation()
    beginNodeDrag(touch.clientX, touch.clientY, nodeId)
  }

  useEffect(() => {
    if (draggingNodeId === null) return
    const move = (clientX: number, clientY: number) => {
      const world = clientToWorld(clientX, clientY)
      if (!world) return
      setManualPositions((prev) => ({
        ...prev,
        [draggingNodeId]: {
          x: world.x - dragStartOffset.x,
          y: world.y - dragStartOffset.y,
        },
      }))
    }
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      move(e.clientX, e.clientY)
    }
    const onMouseUp = () => setDraggingNodeId(null)
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      move(t.clientX, t.clientY)
    }
    const onTouchEnd = () => setDraggingNodeId(null)
    window.addEventListener('mousemove', onMouseMove, { passive: false })
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [draggingNodeId, dragStartOffset, clientToWorld])

  // Form handlers
  const handleAddRelative = async (values: FamilyRelativeCreate & { birth_date?: dayjs.Dayjs; death_date?: dayjs.Dayjs }) => {
    if (!user) return

    try {
      const data: FamilyRelativeCreate = {
        ...values,
        birth_date: values.birth_date?.toISOString() || null,
        death_date: values.death_date?.toISOString() || null,
        image_url: fileList[0]?.response?.url || fileList[0]?.url || null,
      }
      const newRelative = await familyApi.createRelative(user.id, data)
      setRelatives((prev) => [...prev, newRelative])
      message.success('Родственник добавлен')
      setAddRelativeModal(false)
      form.resetFields()
      setFileList([])
    } catch (error) {
      const apiError = error as ApiError
      message.error(getErrorMessage(apiError))
    }
  }

  const handleEditRelative = async (values: FamilyRelativeCreate & { birth_date?: dayjs.Dayjs; death_date?: dayjs.Dayjs }) => {
    if (!user || !selectedRelative) return

    try {
      const data = {
        ...values,
        birth_date: values.birth_date?.toISOString() || null,
        death_date: values.death_date?.toISOString() || null,
        image_url: fileList[0]?.response?.url || fileList[0]?.url || selectedRelative.image_url || null,
      }
      const updated = await familyApi.updateRelative(user.id, selectedRelative.id, data)
      setRelatives((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      // Update selectedRelative but preserve context
      setSelectedRelative({ ...updated, context: selectedRelative.context })
      message.success('Данные обновлены')
      setEditRelativeModal(false)
      editForm.resetFields()
      setFileList([])
    } catch (error) {
      const apiError = error as ApiError
      message.error(getErrorMessage(apiError))
    }
  }

  const handleAddRelationship = async (values: FamilyRelationshipCreate) => {
    if (!user) return

    try {
      const newRelationship = await relationshipApi.createRelationship(user.id, values)
      setRelationships((prev) => [...prev, newRelationship])
      message.success('Связь создана')
      setAddRelationshipModal(false)
      relationshipForm.resetFields()
    } catch (error) {
      const apiError = error as ApiError
      message.error(getErrorMessage(apiError))
    }
  }

  const handleDeleteRelationship = async (relationshipId: number) => {
    if (!user) return

    try {
      await relationshipApi.deleteRelationship(user.id, relationshipId)
      setRelationships((prev) => prev.filter((r) => r.id !== relationshipId))
      message.success('Связь удалена')
    } catch (error) {
      const apiError = error as ApiError
      message.error(getErrorMessage(apiError))
    }
  }

  const handleDeleteRelative = async (relativeId: number) => {
    if (!user) return
    modal.confirm({
      title: <span className="text-white text-lg">Удалить родственника?</span>,
      icon: <Trash2 className="w-6 h-6 text-red-500 mr-2" />,
      content: (
        <div className="text-gray-300 mt-2">
          Вы уверены, что хотите удалить этого родственника? Это действие нельзя отменить, и все связи будут разорваны.
        </div>
      ),
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      centered: true,
      maskClosable: true,
      className: 'confirm-modal-dark',
      okButtonProps: { 
        className: 'bg-red-500 hover:bg-red-600 border-none shadow-lg shadow-red-500/20',
        size: 'large'
      },
      cancelButtonProps: { 
        className: 'text-gray-300 hover:text-white border-white/10 hover:border-white/20 hover:bg-white/5',
        size: 'large'
      },
      onOk: async () => {
        try {
          await familyApi.deleteRelative(user.id, relativeId)
          setRelatives((prev) => prev.filter((r) => r.id !== relativeId))
          setRelationships((prev) => prev.filter((r) => r.from_relative_id !== relativeId && r.to_relative_id !== relativeId))
          if (selectedRelative?.id === relativeId) setSelectedRelative(null)
          message.success('Родственник удалён')
        } catch (error) {
          const apiError = error as ApiError
          message.error(getErrorMessage(apiError))
        }
      },
    })
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
      message.success('Вы успешно вышли из системы')
      router.push('/')
    } catch {
      clearAuthTokens()
      router.push('/')
    }
  }

  const openEditModal = () => {
    if (!selectedRelative) return

    editForm.setFieldsValue({
      first_name: selectedRelative.first_name,
      last_name: selectedRelative.last_name,
      middle_name: selectedRelative.middle_name,
      gender: selectedRelative.gender,
      birth_date: selectedRelative.birth_date ? dayjs(selectedRelative.birth_date) : null,
      death_date: selectedRelative.death_date ? dayjs(selectedRelative.death_date) : null,
      generation: selectedRelative.generation,
      contact_info: selectedRelative.contact_info,
    })
    if (selectedRelative.image_url) {
      setFileList([{ uid: '-1', name: 'photo', status: 'done', url: selectedRelative.image_url }])
    }
    setEditRelativeModal(true)
  }

  // Open stories modal and load existing stories
  const openStoriesModal = () => {
    if (!selectedRelative) return
    // Convert context object to stories array
    const contextObj = selectedRelative.context || {}
    const storiesArray = Object.entries(contextObj).map(([key, value]) => ({
      key,
      value: String(value),
    }))
    setStories(storiesArray)
    setNewStoryKey('')
    setNewStoryValue('')
    setViewingStory(null)
    setStoriesModal(true)
  }

  // Add a new story
  const handleAddStory = async () => {
    if (!user || !selectedRelative || !newStoryKey.trim() || !newStoryValue.trim()) {
      message.warning('Заполните название и текст истории')
      return
    }

    try {
      await familyApi.updateContext(user.id, selectedRelative.id, newStoryKey.trim(), newStoryValue.trim())
      // Update local state
      setStories((prev) => [...prev, { key: newStoryKey.trim(), value: newStoryValue.trim() }])
      // Update selected relative context
      const updatedContext = { ...(selectedRelative.context || {}), [newStoryKey.trim()]: newStoryValue.trim() }
      const updatedRelative = { ...selectedRelative, context: updatedContext }
      setSelectedRelative(updatedRelative)
      setRelatives((prev) => prev.map((r) => (r.id === selectedRelative.id ? updatedRelative : r)))
      setNewStoryKey('')
      setNewStoryValue('')
      message.success('История добавлена')
    } catch (error) {
      const apiError = error as ApiError
      message.error(getErrorMessage(apiError))
    }
  }

  // Remove a story (set empty value via API to remove)
  const handleRemoveStory = async (keyToRemove: string) => {
    if (!user || !selectedRelative) return

    try {
      // Update context by removing the key (set to empty or use update API)
      const updatedContext = { ...(selectedRelative.context || {}) }
      delete updatedContext[keyToRemove]

      // Update the relative with new context
      await familyApi.updateRelative(user.id, selectedRelative.id, { context: updatedContext })

      // Update local state
      setStories((prev) => prev.filter((s) => s.key !== keyToRemove))
      const updatedRelative = { ...selectedRelative, context: updatedContext }
      setSelectedRelative(updatedRelative)
      setRelatives((prev) => prev.map((r) => (r.id === selectedRelative.id ? updatedRelative : r)))
      message.success('История удалена')
    } catch (error) {
      const apiError = error as ApiError
      message.error(getErrorMessage(apiError))
    }
  }

  const uploadProps: UploadProps = {
    listType: 'picture-card',
    fileList,
    maxCount: 1,
    action: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/storage/upload`,
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''}`,
    },
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        message.error('Можно загружать только изображения!')
        return Upload.LIST_IGNORE
      }
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isLt5M) {
        message.error('Изображение должно быть меньше 5MB!')
        return Upload.LIST_IGNORE
      }
      return true
    },
    onChange: (info) => {
      setFileList(info.fileList)
      if (info.file.status === 'done') {
        message.success('Фото успешно загружено')
      } else if (info.file.status === 'error') {
        message.error('Ошибка загрузки фото')
      }
    },
    onRemove: () => {
      setFileList([])
    },
  }

  // Get position for a relative by ID
  const getPosition = (relativeId: number) => {
    return nodePositions.find((n) => n.relative.id === relativeId)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilterGender(null)
    setFilterGeneration(null)
    setFilterAlive(null)
    setFilterHasStories(null)
    setSearchTerm('')
  }

  const hasActiveFilters = filterGender || filterGeneration !== null || filterAlive !== null || filterHasStories !== null || searchTerm

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-charcoal-950 overflow-hidden">
      {/* Header */}
      <header className="border-b border-charcoal-700 bg-charcoal-900/80 backdrop-blur-sm z-50 flex-shrink-0">
        <nav className="max-w-full mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Назад</span>
            </Link>
            <div className="h-6 w-px bg-charcoal-700" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
                <TreePine className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-serif text-lg font-bold">
                <span className="text-white">Genetic</span>
                <span className="gradient-text">Tree</span>
              </span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-40 bg-charcoal-800 border-charcoal-700 h-8"
                size="small"
              />
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-charcoal-800 border border-charcoal-700">
              <Button
                type="text"
                size="small"
                icon={<ZoomOut className="w-4 h-4" />}
                onClick={() => setScale((s) => Math.max(s * 0.9, 0.3))}
              />
              <span className="text-xs text-gray-400 w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                type="text"
                size="small"
                icon={<ZoomIn className="w-4 h-4" />}
                onClick={() => setScale((s) => Math.min(s * 1.1, 2))}
              />
            </div>


            {/* User menu */}
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-charcoal-800 border border-charcoal-700">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-xs">{user?.username}</span>
            </div>
            <Button
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
              type="text"
              size="small"
              className="text-gray-400 hover:text-white"
            />
          </div>
        </nav>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-4 z-20 p-2 rounded-r-xl bg-charcoal-900 border border-charcoal-700 text-gray-400 hover:text-white transition-all duration-300 ${
            isSidebarOpen ? 'left-56' : 'left-0 rounded-l-none border-l-0'
          }`}
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
        </button>

        {/* Filter Sidebar */}
        <div 
          className={`flex-shrink-0 border-r border-charcoal-700 bg-charcoal-900/50 p-4 overflow-y-auto control-panel transition-all duration-300 ${
            isSidebarOpen ? 'w-56 translate-x-0' : 'w-0 -translate-x-full px-0 border-none opacity-0'
          }`}
        >
          {/* Action buttons */}
          <div className="mb-6 space-y-2">
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setAddRelativeModal(true)}
              block
              className="shadow-glow-orange h-10 flex items-center justify-center gap-1 text-sm"
            >
              Родственник
            </Button>
            <Button
              icon={<Link2 className="w-4 h-4" />}
              onClick={() => setAddRelationshipModal(true)}
              block
              className="bg-charcoal-800 border-charcoal-700 h-9 flex items-center justify-center gap-1 text-sm"
              disabled={relatives.length < 2}
            >
              Связь
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange" />
              Фильтры
            </h3>
            {hasActiveFilters && (
              <Button type="link" size="small" onClick={clearFilters} className="text-xs p-0 h-auto">
                Сбросить
              </Button>
            )}
          </div>

          {/* Connections toggle */}
          <div className="mb-4">
            <Button
              block
              size="small"
              className={`text-xs ${!showConnections ? 'bg-orange/20 text-orange border-orange/30' : 'bg-charcoal-800 border-charcoal-700 text-gray-300'}`}
              onClick={() => setShowConnections(!showConnections)}
            >
              {showConnections ? 'Скрыть связи' : 'Показать связи'}
            </Button>
          </div>

          {/* Gender filter */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Пол</label>
            <Select
              value={filterGender}
              onChange={setFilterGender}
              className="w-full"
              size="small"
              allowClear
              placeholder="Все"
            >
              <Select.Option value="male">Мужской</Select.Option>
              <Select.Option value="female">Женский</Select.Option>
              <Select.Option value="other">Другой</Select.Option>
            </Select>
          </div>

          {/* Generation filter */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Поколение</label>
            <Select
              value={filterGeneration}
              onChange={setFilterGeneration}
              className="w-full"
              size="small"
              allowClear
              placeholder="Все"
            >
              {uniqueGenerations.map((g) => (
                <Select.Option key={g} value={g}>
                  Поколение {generationLabels.get(g)?.roman ?? g}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Alive filter */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Статус</label>
            <Select
              value={filterAlive}
              onChange={setFilterAlive}
              className="w-full"
              size="small"
              allowClear
              placeholder="Все"
            >
              <Select.Option value={true}>Живые</Select.Option>
              <Select.Option value={false}>Ушедшие</Select.Option>
            </Select>
          </div>

          {/* Stories filter */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Истории</label>
            <Select
              value={filterHasStories}
              onChange={setFilterHasStories}
              className="w-full"
              size="small"
              allowClear
              placeholder="Все"
            >
              <Select.Option value={true}>С историями</Select.Option>
              <Select.Option value={false}>Без историй</Select.Option>
            </Select>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-4 border-t border-charcoal-700">
            <h4 className="text-xs text-gray-400 mb-3">Статистика</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Родственников</span>
                <span className="font-medium">{relatives.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Связей</span>
                <span className="font-medium">{relationships.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Поколений</span>
                <span className="font-medium">{uniqueGenerations.length}</span>
              </div>
            </div>
          </div>

          {/* Generation legend */}
          {uniqueGenerations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-charcoal-700">
              <h4 className="text-xs text-gray-400 mb-3 flex items-center gap-2">
                <Layers className="w-3 h-3" />
                Поколения
              </h4>
              <div className="space-y-1">
                {uniqueGenerations.map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilterGeneration(filterGeneration === g ? null : g)}
                    className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                      filterGeneration === g
                        ? 'bg-orange/20 text-orange'
                        : 'hover:bg-charcoal-700 text-gray-300'
                    }`}
                  >
                    <span className="font-semibold text-orange">
                      {generationLabels.get(g)?.roman ?? g}
                    </span>{' '}
                    поколение
                    <span className="text-[11px] text-gray-500 ml-1">значение {g}</span>{' '}
                    ({relatives.filter((r) => r.generation === g).length})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tree Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            background: `
              radial-gradient(ellipse at 50% 0%, rgba(255, 107, 53, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.02) 0%, transparent 30%),
              radial-gradient(circle at 80% 60%, rgba(255, 107, 53, 0.02) 0%, transparent 30%),
              linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 100%)
            `,
          }}
        >
          {/* Decorative tree trunk pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0v60M0 30h60' stroke='%23ff6b35' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
          {relatives.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Empty
                description={
                  <span className="text-gray-400">
                    У вас пока нет родственников в древе
                  </span>
                }
              >
                <Button
                  type="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setAddRelativeModal(true)}
                  className="shadow-glow-orange"
                >
                  Добавить первого родственника
                </Button>
              </Empty>
            </div>
          ) : (
            <div
              className="absolute"
              style={{
                left: 0,
                top: 0,
                width: canvasMetrics.width,
                height: canvasMetrics.height,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl border border-orange/25"
                style={{
                  boxShadow: '0 0 0 1px rgba(255,107,53,0.08), 0 0 80px rgba(255,107,53,0.12)',
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(255,107,53,0.04), transparent 42%), radial-gradient(circle at 80% 70%, rgba(255,107,53,0.03), transparent 40%)',
                  outline: '120px solid rgba(255,107,53,0.02)',
                }}
              />
              {/* SVG for connection lines - Family tree style with orthogonal routing */}
              {showConnections && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ overflow: 'visible', zIndex: 5 }}
                >
                  <defs>
                    {/* Glow filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    {/* Arrow markers for each relationship type */}
                    {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
                      <marker
                        key={`arrow-${type}`}
                        id={`arrow-${type}`}
                        markerWidth="10"
                        markerHeight="10"
                        refX="5"
                        refY="5"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <circle cx="5" cy="5" r="3.2" fill={color} fillOpacity="0.9" />
                      </marker>
                    ))}
                  </defs>
                  {(() => {
                    // Group relationships by pair to offset duplicates
                    const pairMap = new Map<string, typeof relationships>()
                    relationships.forEach((rel) => {
                      const key = [rel.from_relative_id, rel.to_relative_id].sort().join('-')
                      if (!pairMap.has(key)) pairMap.set(key, [])
                      pairMap.get(key)!.push(rel)
                    })

                    const curve = (x1: number, y1: number, x2: number, y2: number, offset = 80) => {
                      const cx1 = x1
                      const cy1 = y1 + (y2 > y1 ? offset : -offset)
                      const cx2 = x2
                      const cy2 = y2 - (y2 > y1 ? offset : -offset)
                      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
                    }

                    return relationships.map((rel) => {
                      const fromPos = getPosition(rel.from_relative_id)
                      const toPos = getPosition(rel.to_relative_id)
                      if (!fromPos || !toPos) return null

                      const key = [rel.from_relative_id, rel.to_relative_id].sort().join('-')
                      const duplicates = pairMap.get(key) || []
                      const dupIndex = duplicates.findIndex((r) => r.id === rel.id)
                      const dupCount = duplicates.length
                      const dupOffset = dupCount > 1 ? (dupIndex - (dupCount - 1) / 2) * 40 : 0

                      const sameGeneration = fromPos.relative.generation === toPos.relative.generation
                      const isSpouse = SPOUSE_TYPES.has(rel.relationship_type)
                      const isSibling = SIBLING_TYPES.has(rel.relationship_type)
                      const wireColor = RELATIONSHIP_COLORS[rel.relationship_type] || RELATIONSHIP_COLORS.unknown

                      let startX: number
                      let startY: number
                      let endX: number
                      let endY: number
                      let pathD: string
                      let labelX: number
                      let labelY: number

                      if (isSpouse) {
                        const fromRight = fromPos.x <= toPos.x
                        // Connect to exact edges
                        const sx = toCanvasX(fromRight ? fromPos.x + CARD_WIDTH : fromPos.x)
                        const ex = toCanvasX(fromRight ? toPos.x : toPos.x + CARD_WIDTH)
                        const sy = toCanvasY(fromPos.y + CARD_HEIGHT * 0.25) // Connect slightly higher
                        const ey = toCanvasY(toPos.y + CARD_HEIGHT * 0.25)
                        const controlY = Math.min(sy, ey) - 40 - Math.abs(dupOffset) * 0.4
                        startX = sx
                        startY = sy
                        endX = ex
                        endY = ey
                        // Orthogonal path for clear "on the wire" label
                        pathD = `M ${sx} ${sy} V ${controlY} H ${ex} V ${ey}`
                        labelX = (sx + ex) / 2
                        labelY = controlY
                      } else if (isSibling && sameGeneration) {
                        const fromRight = fromPos.x <= toPos.x
                        const sx = toCanvasX(fromRight ? fromPos.x + CARD_WIDTH : fromPos.x)
                        const ex = toCanvasX(fromRight ? toPos.x : toPos.x + CARD_WIDTH)
                        const sy = toCanvasY(fromPos.y + CARD_HEIGHT * 0.45 + dupOffset)
                        const ey = toCanvasY(toPos.y + CARD_HEIGHT * 0.45 - dupOffset)
                        const controlY = Math.min(sy, ey) - 50 - Math.abs(dupOffset) * 0.5
                        startX = sx
                        startY = sy
                        endX = ex
                        endY = ey
                        pathD = `M ${sx} ${sy} C ${sx} ${controlY}, ${ex} ${controlY}, ${ex} ${ey}`
                        labelX = (sx + ex) / 2
                        labelY = controlY - 10
                      } else if (sameGeneration) {
                        const fromRight = fromPos.x <= toPos.x
                        const sx = toCanvasX(fromRight ? fromPos.x + CARD_WIDTH : fromPos.x)
                        const ex = toCanvasX(fromRight ? toPos.x : toPos.x + CARD_WIDTH)
                        const sy = toCanvasY(fromPos.y + CARD_HEIGHT / 2 + dupOffset)
                        const ey = toCanvasY(toPos.y + CARD_HEIGHT / 2 - dupOffset)
                        startX = sx
                        startY = sy
                        endX = ex
                        endY = ey
                        pathD = curve(sx, sy, ex, ey, 60 + Math.abs(dupOffset))
                        labelX = (sx + ex) / 2
                        labelY = (sy + ey) / 2 - 12
                      } else {
                        const upper = fromPos.y < toPos.y ? fromPos : toPos
                        const lower = fromPos.y < toPos.y ? toPos : fromPos
                        // Connect from Bottom to Top (exact edges)
                        const sx = toCanvasX(upper.x + CARD_WIDTH / 2 + dupOffset)
                        const sy = toCanvasY(upper.y + CARD_HEIGHT)
                        const ex = toCanvasX(lower.x + CARD_WIDTH / 2 + dupOffset)
                        const ey = toCanvasY(lower.y)
                        startX = sx
                        startY = sy
                        endX = ex
                        endY = ey
                        pathD = curve(sx, sy, ex, ey, 80 + Math.abs(dupOffset))
                        labelX = (sx + ex) / 2
                        labelY = (sy + ey) / 2
                      }

                      const label = RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type
                      const labelWidth = Math.max(60, label.length * 7 + 16)

                      return (
                        <g key={rel.id} className="connection-group">
                          {/* Glow effect */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={wireColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.12"
                          />
                          {/* Main wire with arrow */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={wireColor}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            markerEnd={`url(#arrow-${rel.relationship_type})`}
                          />
                          {/* Start dot */}
                          <circle cx={startX} cy={startY} r="4" fill={wireColor} filter="url(#glow)" />
                          {/* Label background */}
                          <rect
                            x={labelX - labelWidth / 2}
                            y={labelY - 11}
                            width={labelWidth}
                            height="22"
                            rx="11"
                            fill="#0f0f0f"
                            stroke={wireColor}
                            strokeWidth="1.2"
                            opacity="0.9"
                          />
                          {/* Label text */}
                          <text
                            x={labelX}
                            y={labelY + 4}
                            textAnchor="middle"
                            fontSize="10"
                            fill={wireColor}
                            fontWeight="600"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            {label}
                          </text>
                        </g>
                      )
                    })
                  })()}
                </svg>
              )}

              {/* Relative Cards */}
              {nodePositions.map((node) => (
                <div
                  key={node.relative.id}
                  className="absolute relative-card select-none"
                  style={{
                    left: toCanvasX(node.x),
                    top: toCanvasY(node.y),
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    zIndex: 10,
                    touchAction: 'none',
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    beginNodeDrag(e.clientX, e.clientY, node.relative.id)
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0]
                    if (!t) return
                    e.stopPropagation()
                    beginNodeDrag(t.clientX, t.clientY, node.relative.id)
                  }}
                >
                  <RelativeCard
                    relative={node.relative}
                    isSelected={selectedRelative?.id === node.relative.id}
                    onClick={() => setSelectedRelative(node.relative)}
                    size="medium"
                  />
                </div>
              ))}

            </div>
          )}

          {/* Reset view button - правый нижний угол */}
          <div className="absolute bottom-4 right-4 control-panel">
            <Tooltip title="Сбросить вид">
              <Button
                className="bg-charcoal-800 border-charcoal-700"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={() => {
                  setOffset({ x: 0, y: 0 })
                  setScale(1)
                }}
              />
            </Tooltip>
          </div>
        </div>

        {/* Selected Relative Panel */}
        {selectedRelative && (
          <div className="w-72 flex-shrink-0 border-l border-charcoal-700 bg-charcoal-900 overflow-y-auto control-panel">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-lg">Информация</h3>
                <Button
                  type="text"
                  size="small"
                  icon={<X className="w-4 h-4" />}
                  onClick={() => setSelectedRelative(null)}
                />
              </div>

              {/* Photo */}
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-charcoal-800 mb-4 relative">
                {selectedRelative.image_url ? (
                  <img
                    src={getProxiedImageUrl(selectedRelative.image_url) || ''}
                    alt={selectedRelative.first_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-charcoal-700 to-charcoal-800">
                    <span className="text-5xl font-bold text-gray-500">
                      {selectedRelative.first_name.charAt(0)}
                      {selectedRelative.last_name?.charAt(0) || ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="mb-4">
                <h2 className="text-xl font-bold">
                  {selectedRelative.first_name} {selectedRelative.last_name}
                </h2>
                {selectedRelative.middle_name && (
                  <p className="text-gray-400">{selectedRelative.middle_name}</p>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm mb-6">
                {selectedRelative.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Пол</span>
                    <span>{GENDER_LABELS[selectedRelative.gender]}</span>
                  </div>
                )}
                {selectedRelative.birth_date && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Дата рождения</span>
                      <span>{new Date(selectedRelative.birth_date).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Возраст</span>
                      <span>
                        {calculateAge(selectedRelative.birth_date, selectedRelative.death_date)} лет
                        {selectedRelative.death_date && ' (на момент смерти)'}
                      </span>
                    </div>
                  </>
                )}
                {selectedRelative.death_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Дата смерти</span>
                    <span>{new Date(selectedRelative.death_date).toLocaleDateString('ru-RU')}</span>
                  </div>
                )}
                {selectedRelative.generation !== null && selectedRelative.generation !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Поколение</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange/20 text-orange text-xs">
                      {selectedRelative.generation}
                    </span>
                  </div>
                )}
                {selectedRelative.contact_info && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Контакт</span>
                    <span className="truncate max-w-[150px]">{selectedRelative.contact_info}</span>
                  </div>
                )}
              </div>

              {/* Stories / Context */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Истории
                  </h4>
                  <Button
                    type="link"
                    size="small"
                    onClick={openStoriesModal}
                    className="p-0 h-auto text-orange"
                  >
                    Управление
                  </Button>
                </div>
                {selectedRelative.context && Object.keys(selectedRelative.context).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(selectedRelative.context).map(([key, value]) => (
                      <div
                        key={key}
                        className="p-2 rounded-lg bg-charcoal-800 cursor-pointer hover:bg-charcoal-700 transition-colors flex items-center gap-2"
                        onClick={() => {
                          setViewingStory({ key, value: String(value) })
                          setStoriesModal(true)
                        }}
                      >
                        <BookOpen className="w-3 h-3 text-orange flex-shrink-0" />
                        <p className="text-xs font-medium text-white truncate">{key}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Нет историй</p>
                )}
              </div>

              {/* Relationships */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Связи</h4>
                <div className="space-y-1">
                  {relationships
                    .filter(
                      (r) =>
                        r.from_relative_id === selectedRelative.id ||
                        r.to_relative_id === selectedRelative.id
                    )
                    .map((rel) => {
                      const otherId =
                        rel.from_relative_id === selectedRelative.id
                          ? rel.to_relative_id
                          : rel.from_relative_id
                      const other = relatives.find((r) => r.id === otherId)
                      if (!other) return null
                      return (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 p-2 rounded bg-charcoal-800 text-xs group"
                        >
                          <span className="text-orange flex-shrink-0">
                            {RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="flex-1 truncate">{other.first_name} {other.last_name}</span>
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<Trash2 className="w-3 h-3" />}
                            onClick={() => handleDeleteRelationship(rel.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0 h-auto min-w-0"
                          />
                        </div>
                      )
                    })}
                  {relationships.filter(
                    (r) =>
                      r.from_relative_id === selectedRelative.id ||
                      r.to_relative_id === selectedRelative.id
                  ).length === 0 && (
                    <p className="text-xs text-gray-500">Нет связей</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  block
                  icon={<Edit className="w-4 h-4" />}
                  onClick={openEditModal}
                >
                  Редактировать
                </Button>
                <Button
                  block
                  icon={<BookOpen className="w-4 h-4" />}
                  onClick={openStoriesModal}
                >
                  Истории
                </Button>
                <Button
                  block
                  icon={<Send className="w-4 h-4" />}
                  onClick={() => setInvitationModal(true)}
                  className="bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50"
                >
                  Пригласить в Telegram
                </Button>
                <Button
                  block
                  icon={<Link2 className="w-4 h-4" />}
                  onClick={() => {
                    relationshipForm.setFieldValue('from_relative_id', selectedRelative.id)
                    setAddRelationshipModal(true)
                  }}
                >
                  Добавить связь
                </Button>
                <Button
                  block
                  danger
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => handleDeleteRelative(selectedRelative.id)}
                >
                  Удалить родственника
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Relative Modal */}
      <Modal
        title="Добавить родственника"
        open={addRelativeModal}
        onCancel={() => {
          setAddRelativeModal(false)
          form.resetFields()
          setFileList([])
        }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleAddRelative} className="mt-4">
          {/* Photo upload */}
          <Form.Item label="Фотография">
            <Upload {...uploadProps}>
              {fileList.length === 0 && (
                <div className="flex flex-col items-center justify-center p-4">
                  <ImageIcon className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-400">Загрузить фото</span>
                </div>
              )}
            </Upload>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="Имя"
              rules={[{ required: true, message: 'Введите имя' }]}
            >
              <Input placeholder="Имя" />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Фамилия"
              rules={[{ required: true, message: 'Введите фамилию' }]}
            >
              <Input placeholder="Фамилия" />
            </Form.Item>
          </div>

          <Form.Item name="middle_name" label="Отчество">
            <Input placeholder="Отчество" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="gender" label="Пол">
              <Select placeholder="Выберите пол">
                <Select.Option value="male">Мужской</Select.Option>
                <Select.Option value="female">Женский</Select.Option>
                <Select.Option value="other">Другой</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="generation" label="Поколение">
              <Select placeholder="Выберите поколение">
                {generationOptions.map((g) => (
                  <Select.Option key={g} value={g}>
                    Поколение {g}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="birth_date" label="Дата рождения">
              <DatePicker className="w-full" placeholder="Выберите дату" />
            </Form.Item>
            <Form.Item name="death_date" label="Дата смерти">
              <DatePicker className="w-full" placeholder="Если применимо" />
            </Form.Item>
          </div>

          <Form.Item name="contact_info" label="Контактная информация">
            <Input placeholder="Телефон или email" />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setAddRelativeModal(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Relative Modal */}
      <Modal
        title="Редактировать родственника"
        open={editRelativeModal}
        onCancel={() => {
          setEditRelativeModal(false)
          editForm.resetFields()
          setFileList([])
        }}
        footer={null}
        width={500}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditRelative} className="mt-4">
          {/* Photo upload */}
          <Form.Item label="Фотография">
            <Upload {...uploadProps}>
              {fileList.length === 0 && (
                <div className="flex flex-col items-center justify-center p-4">
                  <ImageIcon className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-400">Загрузить фото</span>
                </div>
              )}
            </Upload>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="Имя"
              rules={[{ required: true, message: 'Введите имя' }]}
            >
              <Input placeholder="Имя" />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Фамилия"
              rules={[{ required: true, message: 'Введите фамилию' }]}
            >
              <Input placeholder="Фамилия" />
            </Form.Item>
          </div>

          <Form.Item name="middle_name" label="Отчество">
            <Input placeholder="Отчество" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="gender" label="Пол">
              <Select placeholder="Выберите пол">
                <Select.Option value="male">Мужской</Select.Option>
                <Select.Option value="female">Женский</Select.Option>
                <Select.Option value="other">Другой</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="generation" label="Поколение">
              <Select placeholder="Выберите поколение">
                {generationOptions.map((g) => (
                  <Select.Option key={g} value={g}>
                    Поколение {g}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="birth_date" label="Дата рождения">
              <DatePicker className="w-full" placeholder="Выберите дату" />
            </Form.Item>
            <Form.Item name="death_date" label="Дата смерти">
              <DatePicker className="w-full" placeholder="Если применимо" />
            </Form.Item>
          </div>

          <Form.Item name="contact_info" label="Контактная информация">
            <Input placeholder="Телефон или email" />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setEditRelativeModal(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              Сохранить
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Relationship Modal */}
      <Modal
        title="Создать связь"
        open={addRelationshipModal}
        onCancel={() => {
          setAddRelationshipModal(false)
          relationshipForm.resetFields()
        }}
        footer={null}
        width={500}
      >
        <Form form={relationshipForm} layout="vertical" onFinish={handleAddRelationship} className="mt-4">
          <Form.Item
            name="from_relative_id"
            label="От кого"
            rules={[{ required: true, message: 'Выберите родственника' }]}
          >
            <Select placeholder="Выберите родственника" showSearch optionFilterProp="label">
              {relatives.map((r) => (
                <Select.Option key={r.id} value={r.id} label={`${r.first_name} ${r.last_name}`}>
                  {r.first_name} {r.last_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="relationship_type"
            label="Тип связи"
            rules={[{ required: true, message: 'Выберите тип связи' }]}
          >
            <Select placeholder="Выберите тип связи" showSearch optionFilterProp="label">
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <Select.Option key={value} value={value} label={label}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="to_relative_id"
            label="К кому"
            rules={[{ required: true, message: 'Выберите родственника' }]}
          >
            <Select placeholder="Выберите родственника" showSearch optionFilterProp="label">
              {relatives.map((r) => (
                <Select.Option key={r.id} value={r.id} label={`${r.first_name} ${r.last_name}`}>
                  {r.first_name} {r.last_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setAddRelationshipModal(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              Создать связь
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stories Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange" />
            <span>Истории о {selectedRelative?.first_name}</span>
          </div>
        }
        open={storiesModal}
        onCancel={() => {
          setStoriesModal(false)
          setNewStoryKey('')
          setNewStoryValue('')
          setViewingStory(null)
        }}
        footer={null}
        width={600}
      >
        <div className="mt-4">
          {/* Viewing single story */}
          {viewingStory ? (
            <div>
              <Button
                type="link"
                onClick={() => setViewingStory(null)}
                className="p-0 h-auto mb-3 text-gray-400"
              >
                ← Назад к списку
              </Button>
              <div className="p-4 rounded-lg bg-charcoal-800">
                <h3 className="text-lg font-medium text-orange mb-3">{viewingStory.key}</h3>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{viewingStory.value}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Existing stories - only titles */}
              {stories.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Существующие истории</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {stories.map((story) => (
                      <div
                        key={story.key}
                        className="p-3 rounded-lg bg-charcoal-800 group flex items-center justify-between gap-2 cursor-pointer hover:bg-charcoal-700 transition-colors"
                        onClick={() => setViewingStory(story)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <BookOpen className="w-4 h-4 text-orange flex-shrink-0" />
                          <span className="text-sm font-medium text-white truncate">{story.key}</span>
                        </div>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveStory(story.key)
                          }}
                          className="opacity-60 hover:opacity-100 flex-shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new story */}
              <div className={stories.length > 0 ? "border-t border-charcoal-700 pt-4" : ""}>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Добавить новую историю</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Название истории</label>
                    <Input
                      placeholder="Например: Детство, Военные годы, Профессия..."
                      value={newStoryKey}
                      onChange={(e) => setNewStoryKey(e.target.value)}
                      maxLength={255}
                    />
                  </div>
                  <div className="relative">
                    <label className="text-xs text-gray-400 mb-1 block">Текст истории</label>
                    <Input.TextArea
                      placeholder="Расскажите историю..."
                      value={newStoryValue}
                      onChange={(e) => setNewStoryValue(e.target.value)}
                      rows={4}
                      showCount
                      maxLength={2000}
                    />
                  </div>
                  <div className="pt-2">
                    <Button
                      type="primary"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={handleAddStory}
                      disabled={!newStoryKey.trim() || !newStoryValue.trim()}
                      className="w-full"
                    >
                      Добавить историю
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Invitation Modal */}
      {selectedRelative && user && (
        <InvitationModal
          visible={invitationModal}
          onClose={() => setInvitationModal(false)}
          relativeId={selectedRelative.id}
          relativeName={`${selectedRelative.first_name} ${selectedRelative.last_name}`}
          userId={user.id}
        />
      )}
    </div>
  )
}
