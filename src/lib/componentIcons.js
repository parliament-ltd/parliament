// Shared lookup from catalog `icon` string → lucide-react icon component.
// Extracted from LibraryCard (PR-19c) so the homepage Library AND the
// blueprint room modal (PR-40h) render the same glyph per component.
//
// Add new entries here when a catalog manifest declares a new icon
// name; both consumers pick it up automatically.

import {
  MessagesSquare, MessageSquare, List, Highlighter, StickyNote, GitBranch,
  Activity, Users, ListChecks, Mic, LayoutDashboard, MessageCircle, BookOpen,
  Star, Hash, Clock, NotebookPen, FolderOpen, BarChart3, Table2, Gauge,
  Columns3, FileText, MessageSquareText, Waves, Globe, Paperclip,
  Code2, Film, Palette,
  Box,
} from 'lucide-react'

export const ICON_BY_NAME = {
  MessagesSquare, MessageSquare, List, Highlighter, StickyNote, GitBranch,
  Activity, Users, ListChecks, Mic, LayoutDashboard, MessageCircle, BookOpen,
  Star, Hash, Clock, NotebookPen, FolderOpen, BarChart3, Table2, Gauge,
  Columns3, FileText, MessageSquareText, Waves, Globe, Paperclip,
  Code2, Film, Palette,
}

export const FallbackIcon = Box

export function getIconComponent(name) {
  return ICON_BY_NAME[name] || FallbackIcon
}
