// User types based on backend schemas
export interface User {
  id: number
  username: string
  email?: string | null
  telegram_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreate {
  username: string
  email?: string | null
  password: string
  telegram_id?: string | null
}

export interface UserUpdate {
  username: string
  email?: string | null
  password?: string | null
  is_active?: boolean
}

// Auth types based on backend schemas
export interface LoginRequest {
  username?: string | null
  email?: string | null
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
}

export interface RefreshRequest {
  refresh_token?: string | null
}

export interface AccessTokenResponse {
  access_token: string
}

export interface LogoutResponse {
  status: string
}

export interface MeResponse {
  sub: number
}

// API Error types
export interface ApiError {
  detail: string
  status?: number
}

// Form types
export interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginFormData {
  identifier: string // Can be username or email
  password: string
}

// Telegram Auth types
export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

// Gender enum
export type Gender = 'male' | 'female' | 'other'

// Relationship type enum
export type RelationshipType =
  | 'parent' | 'child' | 'father' | 'mother'
  | 'stepfather' | 'stepmother' | 'adoptive_father' | 'adoptive_mother'
  | 'son' | 'daughter' | 'stepson' | 'stepdaughter'
  | 'adoptive_son' | 'adoptive_daughter'
  | 'grandfather' | 'grandmother' | 'great_grandfather' | 'great_grandmother'
  | 'grandson' | 'granddaughter' | 'great_grandson' | 'great_granddaughter'
  | 'brother' | 'sister' | 'half_brother' | 'half_sister'
  | 'stepbrother' | 'stepsister'
  | 'husband' | 'wife' | 'ex_husband' | 'ex_wife' | 'partner'
  | 'uncle' | 'aunt' | 'great_uncle' | 'great_aunt'
  | 'nephew' | 'niece' | 'grand_nephew' | 'grand_niece'
  | 'cousin' | 'second_cousin'
  | 'father_in_law' | 'mother_in_law' | 'son_in_law' | 'daughter_in_law'
  | 'brother_in_law' | 'sister_in_law'
  | 'godfather' | 'godmother' | 'godson' | 'goddaughter'
  | 'guardian' | 'ward' | 'unknown'

// Family relative types
export interface FamilyRelative {
  id: number
  user_id: number
  image_url?: string | null
  first_name: string
  last_name: string
  middle_name?: string | null
  birth_date?: string | null
  death_date?: string | null
  gender?: Gender | null
  contact_info?: string | null
  telegram_id?: string | null
  invitation_token?: string | null
  telegram_user_id?: number | null
  is_activated: boolean
  activated_at?: string | null
  context?: Record<string, unknown> | null
  generation?: number | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface FamilyRelativeCreate {
  first_name: string
  last_name: string
  middle_name?: string | null
  birth_date?: string | null
  death_date?: string | null
  gender?: Gender
  contact_info?: string | null
  telegram_id?: string | null
  context?: Record<string, unknown> | null
  generation?: number | null
  image_url?: string | null
}

export interface FamilyRelativeUpdate {
  first_name?: string | null
  last_name?: string | null
  middle_name?: string | null
  birth_date?: string | null
  death_date?: string | null
  gender?: Gender
  contact_info?: string | null
  telegram_id?: string | null
  context?: Record<string, unknown> | null
  is_active?: boolean | null
  image_url?: string | null
  generation?: number | null
}

// Family relationship types
export interface FamilyRelationship {
  id: number
  user_id: number
  from_relative_id: number
  to_relative_id: number
  relationship_type: RelationshipType
  created_at: string
  is_active: boolean
}

export interface FamilyRelationshipCreate {
  from_relative_id: number
  to_relative_id: number
  relationship_type: RelationshipType
}

export interface FamilyRelationshipUpdate {
  relationship_type?: RelationshipType | null
  is_active?: boolean | null
}

// Statistics types
export interface GenderStatistics {
  male: number
  female: number
  other: number
}

export interface RelationshipTypeCount {
  type: string
  count: number
}

export interface FamilyStatistics {
  total_relatives: number
  total_relationships: number
  alive_relatives: number
  deceased_relatives: number
  activated_relatives: number
  gender_distribution: GenderStatistics
  relationship_types_count: number
  generations_count: number
  relationship_types: RelationshipTypeCount[]
  total_stories: number
}

// Tree node for canvas visualization
export interface TreeNode {
  id: number
  relative: FamilyRelative
  x: number
  y: number
  children: TreeNode[]
  parents: TreeNode[]
  spouses: TreeNode[]
}

// Story media types
export type StoryMediaType = 'image' | 'video' | 'audio'

export interface StoryMedia {
  type: StoryMediaType
  url: string
  filename?: string | null
  content_type?: string | null
  size?: number | null
  duration?: number | null
}

export interface Story {
  title: string
  text?: string | null
  media: StoryMedia[]
  created_at?: string | null
  updated_at?: string | null
}

export interface StoryCreate {
  title: string
  text?: string | null
}

export interface StoryUpdate {
  title?: string | null
  text?: string | null
}

export interface StoryMediaUploadResponse {
  story_key: string
  media: StoryMedia
  message: string
}

// Invitation types
export interface InvitationResponse {
  invitation_url: string
  token: string
  relative_id: number
  relative_name: string
}
