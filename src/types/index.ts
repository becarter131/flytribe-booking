export interface FtActivity {
  id: string
  slug: string
  name: string
  description: string | null
  min_participants: number
  max_participants: number | null
  sort: number
}

export interface FtUser {
  id: string
  name: string
  email: string
}
