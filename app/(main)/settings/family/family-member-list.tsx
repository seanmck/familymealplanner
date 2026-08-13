'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface FamilyMemberListProps {
  initialMembers: FamilyMember[]
  selfMemberId?: string | null
}

export function FamilyMemberList({ initialMembers, selfMemberId }: FamilyMemberListProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'ADULT' | 'CHILD'>('ADULT')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'ADULT' | 'CHILD'>('ADULT')

  const handleAdd = async () => {
    if (!newName.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), role: newRole }),
      })

      if (!response.ok) throw new Error('Failed to add member')

      const member = await response.json()
      setMembers([...members, member])
      setNewName('')
      toast.success('Family member added')
      router.refresh()
    } catch (error) {
      toast.error('Failed to add family member')
      console.error(error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/family/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), role: editRole }),
      })

      if (!response.ok) throw new Error('Failed to update member')

      const updated = await response.json()
      setMembers(members.map((m) => (m.id === id ? updated : m)))
      setEditingId(null)
      toast.success('Family member updated')
      router.refresh()
    } catch (error) {
      toast.error('Failed to update family member')
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/family/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete member')

      setMembers(members.filter((m) => m.id !== id))
      toast.success('Family member removed')
      router.refresh()
    } catch (error) {
      toast.error('Failed to remove family member')
      console.error(error)
    }
  }

  const startEdit = (member: FamilyMember) => {
    setEditingId(member.id)
    setEditName(member.name)
    setEditRole(member.role)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Family Member</CardTitle>
          <CardDescription>
            Add someone to your household to track their meal preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="name" className="sr-only">
                Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <Select
              value={newRole}
              onValueChange={(v) => setNewRole(v as 'ADULT' | 'CHILD')}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADULT">Adult</SelectItem>
                <SelectItem value="CHILD">Child</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No family members yet. Add someone above!
          </p>
        ) : (
          members.map((member) => (
            <Card key={member.id}>
              <CardContent className="py-4">
                {editingId === member.id ? (
                  <div className="flex gap-4 items-center">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={editRole}
                      onValueChange={(v) => setEditRole(v as 'ADULT' | 'CHILD')}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADULT">Adult</SelectItem>
                        <SelectItem value="CHILD">Child</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleEdit(member.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{member.name}</span>
                      <Badge variant={member.role === 'CHILD' ? 'secondary' : 'outline'}>
                        {member.role === 'CHILD' ? 'Child' : 'Adult'}
                      </Badge>
                      {member.id === selfMemberId && <Badge>You</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(member)}
                      >
                        Edit
                      </Button>
                      {/* Removing yourself would drop you out of meal reviews */}
                      {member.id !== selfMemberId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(member.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
