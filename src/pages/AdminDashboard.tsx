import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import Logo from '@/components/ui/Logo';
import { AudioPlayerWithUrl } from '@/components/audio/AudioPlayerWithUrl';
import { toast } from '@/hooks/use-toast';
import {
  LogOut,
  Users,
  Music,
  Search,
  Download,
  Check,
  X,
  Clock,
  Calendar,
  UserX,
  UserCheck,
  Image,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { generateMusicUrl, generateCoverArtUrl } from '@/lib/storage-utils';

interface Track {
  id: string;
  title: string;
  genre: string;
  music_file_url: string;
  cover_art_url?: string;
  duration?: number;
  status: 'pending' | 'approved' | 'rejected';
  upload_date: string;
  artist_id: string;
  deleted_at?: string;
  deleted_by?: string;
  artist?: {
    name: string;
    email: string;
  };
  deleted_by_user?: {
    name: string;
  };
}

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [deletedTracks, setDeletedTracks] = useState<Track[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'users' | 'recycle-bin'>('tracks');

  useEffect(() => {
    fetchData();

    const tracksChannel = supabase
      .channel('admin-tracks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracks' },
        () => { fetchTracks(); }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => { fetchProfiles(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tracksChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTracks(), fetchProfiles(), fetchDeletedTracks()]);
    setLoading(false);
  };

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          artist:profiles!tracks_artist_id_fkey (
            name,
            email
          )
        `)
        .is('deleted_at', null)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setTracks((data as any) || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tracks',
        variant: 'destructive'
      });
    }
  };

  const fetchDeletedTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          artist:profiles!tracks_artist_id_fkey (
            name,
            email
          ),
          deleted_by_user:profiles!tracks_deleted_by_fkey (
            name
          )
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedTracks((data as any) || []);
    } catch (error) {
      console.error('Error fetching deleted tracks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch deleted tracks',
        variant: 'destructive'
      });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles((data as Profile[]) || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      });
    }
  };

  const updateTrackStatus = async (trackId: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ status })
        .eq('id', trackId);

      if (error) throw error;

      setTracks(prevTracks => 
        prevTracks.map(track => 
          track.id === trackId ? { ...track, status } : track
        )
      );

      toast({
        title: 'Success!',
        description: `Track ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'set to pending'} successfully`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update track status',
        variant: 'destructive'
      });
    }
  };

  const bulkUpdateStatus = async (status: 'approved' | 'rejected' | 'pending') => {
    if (selectedTracks.length === 0) {
      toast({
        title: 'No Tracks Selected',
        description: 'Please select tracks to update',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ status })
        .in('id', selectedTracks);

      if (error) throw error;

      toast({
        title: 'Bulk Update Complete',
        description: `${selectedTracks.length} tracks updated to ${status}`,
      });

      setSelectedTracks([]);
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast({
        title: 'Bulk Update Failed',
        description: 'Failed to update selected tracks',
        variant: 'destructive'
      });
    }
  };

  const moveToRecycleBin = async (trackId: string) => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('tracks')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: data.user.id 
        })
        .eq('id', trackId);

      if (error) throw error;

      await fetchData();
      toast({
        title: 'Track Moved to Recycle Bin',
        description: 'Track can be restored from the recycle bin',
      });
    } catch (error) {
      console.error('Error moving track to recycle bin:', error);
      toast({
        title: 'Move Failed',
        description: 'Failed to move track to recycle bin',
        variant: 'destructive'
      });
    }
  };

  const restoreTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ 
          deleted_at: null,
          deleted_by: null 
        })
        .eq('id', trackId);

      if (error) throw error;

      await fetchData();
      toast({
        title: 'Track Restored',
        description: 'Track has been restored successfully',
      });
    } catch (error) {
      console.error('Error restoring track:', error);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore track',
        variant: 'destructive'
      });
    }
  };

  const permanentlyDeleteTrack = async (trackId: string) => {
    try {
      const track = deletedTracks.find(t => t.id === trackId);
      if (!track) return;

      // Delete files from storage
      const deletePromises = [];
      
      if (track.music_file_url) {
        const musicPath = track.music_file_url.includes('http') 
          ? track.music_file_url.split('/').pop()?.split('?')[0]
          : track.music_file_url;
        
        if (musicPath) {
          deletePromises.push(
            supabase.storage.from('music-files').remove([musicPath]),
            supabase.storage.from('tracks').remove([musicPath])
          );
        }
      }

      if (track.cover_art_url) {
        const coverPath = track.cover_art_url.includes('http')
          ? track.cover_art_url.split('/').pop()?.split('?')[0]
          : track.cover_art_url;
        
        if (coverPath) {
          deletePromises.push(
            supabase.storage.from('cover-art').remove([coverPath]),
            supabase.storage.from('tracks').remove([coverPath])
          );
        }
      }

      await Promise.allSettled(deletePromises);

      // Delete track record
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      await fetchDeletedTracks();
      toast({
        title: 'Track Permanently Deleted',
        description: 'Track and associated files deleted. Storage space freed.',
      });
    } catch (error) {
      console.error('Error permanently deleting track:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to permanently delete track',
        variant: 'destructive'
      });
    }
  };

  const emptyRecycleBin = async () => {
    try {
      for (const track of deletedTracks) {
        await permanentlyDeleteTrack(track.id);
      }
      toast({
        title: 'Recycle Bin Emptied',
        description: 'All deleted tracks have been permanently removed',
      });
    } catch (error) {
      console.error('Error emptying recycle bin:', error);
      toast({
        title: 'Empty Failed',
        description: 'Failed to empty recycle bin',
        variant: 'destructive'
      });
    }
  };

  const downloadTrack = async (url: string, filename: string) => {
    try {
      if (!url) {
        toast({
          title: 'Download Failed',
          description: 'No music file URL available',
          variant: 'destructive'
        });
        return;
      }

      // If it's already a full URL, use it directly
      if (url.startsWith('http')) {
        window.open(url, '_blank');
        return;
      }

      // For file paths, generate a signed URL from private bucket
      try {
        const { data, error } = await supabase.storage
          .from('music-files')
          .createSignedUrl(url, 60); // 60 seconds expiry

        if (error) {
          // Fallback to tracks bucket if music-files fails
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('tracks')
            .createSignedUrl(url, 60);

          if (fallbackError) throw fallbackError;
          window.open(fallbackData.signedUrl, '_blank');
        } else {
          window.open(data.signedUrl, '_blank');
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
        toast({
          title: 'Download Failed',
          description: 'Failed to generate download link',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download track',
        variant: 'destructive'
      });
    }
  };

  const downloadCoverArt = async (url: string) => {
    try {
      if (!url) {
        toast({
          title: 'No Cover Art',
          description: 'This track has no cover art to download',
          variant: 'destructive'
        });
        return;
      }

      const signedUrl = await generateCoverArtUrl(url);
      
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast({
          title: 'Download Failed',
          description: 'Failed to generate cover art download link',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Cover art download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download cover art',
        variant: 'destructive'
      });
    }
  };

  const toggleUserStatus = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'artist' ? 'inactive' : 'artist';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'User Status Updated',
        description: `User ${newRole === 'inactive' ? 'deactivated' : 'reactivated'}`,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update user status',
        variant: 'destructive'
      });
    }
  };

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         track.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (track.artist?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || track.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="status-approved bg-green-500 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-rejected bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge className="status-pending bg-violet-500 text-white">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const toggleAllTracks = () => {
    if (selectedTracks.length === filteredTracks.length) {
      setSelectedTracks([]);
    } else {
      setSelectedTracks(filteredTracks.map(track => track.id));
    }
  };

  const stats = {
    totalTracks: tracks.length,
    pendingTracks: tracks.filter(t => t.status === 'pending').length,
    approvedTracks: tracks.filter(t => t.status === 'approved').length,
    rejectedTracks: tracks.filter(t => t.status === 'rejected').length,
    deletedTracks: deletedTracks.length,
    totalUsers: profiles.length,
    activeUsers: profiles.filter(p => p.role === 'artist').length,
    inactiveUsers: profiles.filter(p => p.role === 'inactive').length
  };

  return (
    <AuthGuard requireAuth requireAdmin>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mobile-container py-4 flex items-center justify-between">
            <div className="flex items-center">
              <Logo size="md" />
              <span className="text-lg font-semibold ml-2">Spillrix Distribution</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden sm:inline text-sm text-muted-foreground">Admin Panel</span>
              <Button variant="outline" onClick={signOut} size="sm" className="touch-target">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="mobile-container py-6 md:py-8 space-y-6 md:space-y-8">
          <div className="mobile-grid">
            <Card className="mobile-card">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <Music className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{stats.totalTracks}</p>
                    <p className="text-xs text-muted-foreground">Total Tracks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mobile-card">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <Clock className="h-6 w-6 text-warning" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{stats.pendingTracks}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mobile-card">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <Check className="h-6 w-6 text-success" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{stats.approvedTracks}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mobile-card">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mobile-stack sm:flex-row">
            <Button
              variant={activeTab === 'tracks' ? 'default' : 'outline'}
              onClick={() => setActiveTab('tracks')}
              className="w-full sm:w-auto touch-target"
            >
              <Music className="h-4 w-4 mr-2" />
              Track Management
            </Button>
            <Button
              variant={activeTab === 'recycle-bin' ? 'default' : 'outline'}
              onClick={() => setActiveTab('recycle-bin')}
              className="w-full sm:w-auto touch-target"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Recycle Bin ({stats.deletedTracks})
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'outline'}
              onClick={() => setActiveTab('users')}
              className="w-full sm:w-auto touch-target"
            >
              <Users className="h-4 w-4 mr-2" />
              User Management
            </Button>
          </div>

          {activeTab === 'tracks' ? (
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Track Management</CardTitle>
                <CardDescription>
                  Manage all tracks uploaded by artists
                </CardDescription>
                
                <div className="mobile-stack">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tracks, artists, or genres..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tracks</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedTracks.length > 0 && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground block">
                      {selectedTracks.length} tracks selected
                    </span>
                    <div className="mobile-stack sm:flex-row">
                      <Button size="sm" onClick={() => bulkUpdateStatus('approved')} className="w-full sm:w-auto touch-target">
                        <Check className="h-4 w-4 mr-1" />
                        Approve All
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => bulkUpdateStatus('rejected')} className="w-full sm:w-auto touch-target">
                        <X className="h-4 w-4 mr-1" />
                        Reject All
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('pending')} className="w-full sm:w-auto touch-target">
                        <Clock className="h-4 w-4 mr-1" />
                        Set Pending
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="mobile-table">
                    <div className="mobile-table-content">
                      <Table className="min-w-[1100px] lg:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedTracks.length === filteredTracks.length && filteredTracks.length > 0}
                              onCheckedChange={toggleAllTracks}
                            />
                          </TableHead>
                          <TableHead className="w-20">Cover Art</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Artist</TableHead>
                          <TableHead>Genre</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTracks.map((track) => (
                          <TableRow key={track.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTracks.includes(track.id)}
                                onCheckedChange={() => toggleTrackSelection(track.id)}
                              />
                            </TableCell>
                             <TableCell>
                               <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                                 {track.cover_art_url ? (
                                   <img 
                                      src={track.cover_art_url.startsWith('http') 
                                        ? track.cover_art_url 
                                        : `https://ctwauyndeushfyxzzaxd.supabase.co/storage/v1/object/public/cover-art/${track.cover_art_url}`
                                      }
                                     alt={`${track.title} cover`}
                                     className="w-full h-full object-cover"
                                     onError={(e) => {
                                       // Fallback to tracks bucket for older cover art
                                       const fallbackUrl = track.cover_art_url.startsWith('http') 
                                         ? track.cover_art_url 
                                         : `https://ctwauyndeushfyxzzaxd.supabase.co/storage/v1/object/public/tracks/${track.cover_art_url}`;
                                       e.currentTarget.src = fallbackUrl;
                                       e.currentTarget.style.display = 'none';
                                       e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l6-6v13M9 19c0 1.1.9 2 2 2s2-.9 2-2M9 19H7c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h2M15 19h2c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2v6.5L15 9l2 2.5V19z"/></svg></div>';
                                     }}
                                   />
                                 ) : (
                                   <Music className="h-6 w-6 text-muted-foreground" />
                                 )}
                               </div>
                             </TableCell>
                             <TableCell className="font-medium">{track.title}</TableCell>
                             <TableCell>{track.artist?.name}</TableCell>
                            <TableCell>{track.genre}</TableCell>
                            <TableCell>{formatDuration(track.duration)}</TableCell>
                            <TableCell>{formatDate(track.upload_date)}</TableCell>
                            <TableCell>{getStatusBadge(track.status)}</TableCell>
                            <TableCell>
                              <AudioPlayerWithUrl 
                                filePath={track.music_file_url || ''}
                                title={track.title}
                                className="min-w-[250px] md:min-w-[200px]"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end flex-wrap">
                                {track.status === 'pending' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateTrackStatus(track.id, 'approved')}
                                      className="text-success hover:bg-success hover:text-success-foreground touch-target"
                                      title="Approve"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateTrackStatus(track.id, 'rejected')}
                                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground touch-target"
                                      title="Reject"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : null}
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => downloadTrack(track.music_file_url, `${track.title}.mp3`)}
                                   className="touch-target"
                                   title="Download Track"
                                 >
                                   <Download className="h-4 w-4" />
                                 </Button>
                                  {track.cover_art_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadCoverArt(track.cover_art_url!)}
                                      className="touch-target"
                                      title="Download Cover Art"
                                    >
                                      <Image className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      if (window.confirm('Move this track to recycle bin?')) {
                                        moveToRecycleBin(track.id);
                                      }
                                    }}
                                    className="touch-target"
                                    title="Move to Recycle Bin"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : activeTab === 'recycle-bin' ? (
            <Card className="card-modern">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recycle Bin</CardTitle>
                    <CardDescription>
                      Deleted tracks that can be restored or permanently deleted
                    </CardDescription>
                  </div>
                  {deletedTracks.length > 0 && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        if (window.confirm('Permanently delete all tracks in recycle bin? This will free up storage space but cannot be undone.')) {
                          emptyRecycleBin();
                        }
                      }}
                    >
                      Empty Recycle Bin
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : deletedTracks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No deleted tracks</p>
                    <p className="text-sm">Deleted tracks will appear here</p>
                  </div>
                ) : (
                  <div className="mobile-table">
                    <div className="mobile-table-content">
                      <Table className="min-w-[1000px] lg:min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Cover Art</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Artist</TableHead>
                            <TableHead>Genre</TableHead>
                            <TableHead>Deleted Date</TableHead>
                            <TableHead>Deleted By</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deletedTracks.map((track) => (
                            <TableRow key={track.id}>
                              <TableCell>
                                <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                                  {track.cover_art_url ? (
                                    <img 
                                      src={track.cover_art_url.startsWith('http') 
                                        ? track.cover_art_url 
                                        : `https://ctwauyndeushfyxzzaxd.supabase.co/storage/v1/object/public/cover-art/${track.cover_art_url}`
                                      }
                                      alt={`${track.title} cover`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Music className="h-8 w-8 text-muted-foreground" />
                                  )}
                                </div>
                              </TableCell>
                               <TableCell className="font-medium">{track.title}</TableCell>
                               <TableCell>{track.artist?.name || 'Unknown'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{track.genre || 'Unknown'}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {track.deleted_at ? formatDate(track.deleted_at) : 'Unknown'}
                                </div>
                              </TableCell>
                               <TableCell>
                                 {track.deleted_by_user?.name || 'Unknown Admin'}
                               </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => restoreTrack(track.id)}
                                    className="touch-target"
                                    title="Restore Track"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      if (window.confirm('Permanently delete this track? This will free up storage space but cannot be undone.')) {
                                        permanentlyDeleteTrack(track.id);
                                      }
                                    }}
                                    className="touch-target"
                                    title="Permanently Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                      <Table className="min-w-[600px] sm:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Join Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : user.role === 'artist' ? 'secondary' : 'destructive'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(user.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {user.role !== 'admin' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleUserStatus(user.id, user.role)}
                                  className={`touch-target ${user.role === 'inactive' 
                                    ? "text-success hover:bg-success hover:text-success-foreground" 
                                    : "text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  }`}
                                  title={user.role === 'inactive' ? 'Reactivate User' : 'Deactivate User'}
                                >
                                  {user.role === 'inactive' ? (
                                    <UserCheck className="h-4 w-4" />
                                  ) : (
                                    <UserX className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
