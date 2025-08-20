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
import { Logo } from '@/components/ui/Logo';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { toast } from '@/hooks/use-toast';
import { 
  LogOut, 
  Users, 
  Music, 
  Search, 
  Download, 
  Trash2, 
  Check, 
  X, 
  Clock,
  Calendar,
  UserX,
  UserCheck
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

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
  profiles?: {
    name: string;
    email: string;
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'users'>('tracks');

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscriptions
    const tracksChannel = supabase
      .channel('admin-tracks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracks'
        },
        () => {
          fetchTracks();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tracksChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTracks(), fetchProfiles()]);
    setLoading(false);
  };

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setTracks((data as Track[]) || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tracks',
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

      toast({
        title: 'Status Updated',
        description: `Track status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update track status',
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

  const deleteTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      toast({
        title: 'Track Deleted',
        description: 'Track has been permanently deleted',
      });
    } catch (error) {
      console.error('Error deleting track:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete track',
        variant: 'destructive'
      });
    }
  };

  const downloadTrack = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download track',
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
                         track.profiles?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || track.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="status-approved">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-rejected">Rejected</Badge>;
      default:
        return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (seconds: number | null) => {
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
    totalUsers: profiles.length,
    activeUsers: profiles.filter(p => p.role === 'artist').length,
    inactiveUsers: profiles.filter(p => p.role === 'inactive').length
  };

  return (
    <AuthGuard requireAuth requireAdmin>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mobile-container py-4 flex items-center justify-between">
            <Logo size="md" />
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
          {/* Stats Cards */}
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

          {/* Tab Navigation */}
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
              variant={activeTab === 'users' ? 'default' : 'outline'}
              onClick={() => setActiveTab('users')}
              className="w-full sm:w-auto touch-target"
            >
              <Users className="h-4 w-4 mr-2" />
              User Management
            </Button>
          </div>

          {activeTab === 'tracks' ? (
            /* Tracks Management */
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Track Management</CardTitle>
                <CardDescription>
                  Manage all tracks uploaded by artists
                </CardDescription>
                
                {/* Filters and Search */}
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

                {/* Bulk Actions */}
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
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                      <Table className="min-w-[1000px] sm:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedTracks.length === filteredTracks.length && filteredTracks.length > 0}
                              onCheckedChange={toggleAllTracks}
                            />
                          </TableHead>
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
                            <TableCell className="font-medium">{track.title}</TableCell>
                            <TableCell>{track.profiles?.name}</TableCell>
                            <TableCell>{track.genre}</TableCell>
                            <TableCell>{formatDuration(track.duration)}</TableCell>
                            <TableCell>{formatDate(track.upload_date)}</TableCell>
                            <TableCell>{getStatusBadge(track.status)}</TableCell>
                            <TableCell>
                              <AudioPlayer 
                                src={track.music_file_url}
                                title={track.title}
                                className="min-w-[250px] md:min-w-[200px]"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end flex-wrap">
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadTrack(track.music_file_url, `${track.title}.mp3`)}
                                  className="touch-target"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteTrack(track.id)}
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground touch-target"
                                  title="Delete"
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
            /* User Management */
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