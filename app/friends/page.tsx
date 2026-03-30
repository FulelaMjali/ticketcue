'use client';

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFriends, useFriendRequests, useUserSearch } from '@/hooks/use-friends';
import { Loader2, Search, UserPlus, UserCheck, Clock, X, Check, Users } from 'lucide-react';

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email[0].toUpperCase();
}

export default function FriendsPage() {
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { friends, loading: friendsLoading, removeFriend } = useFriends();
  const { requests, loading: requestsLoading, respond, refetch: refetchRequests } = useFriendRequests();
  const { results, loading: searchLoading, search, sendRequest, clear } = useUserSearch();

  // Debounce the search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { clear(); return; }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search, clear]);

  const handleRespond = async (id: string, action: 'accept' | 'decline') => {
    await respond(id, action);
    if (action === 'accept') refetchRequests();
  };

  const handleSendRequest = async (addresseeId: string) => {
    try {
      await sendRequest(addresseeId);
    } catch {
      // silently fail — the button state will remain if it throws
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Friends</h1>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-0 divide-y divide-border">
              {results.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                    style={{ background: '#6b7280' }}
                  >
                    {getInitials(user.name, user.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name ?? user.email}</p>
                    {user.name && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                  </div>
                  {user.friendshipStatus === 'none' && (
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => handleSendRequest(user.id)}>
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  )}
                  {user.friendshipStatus === 'pending_sent' && (
                    <Button size="sm" variant="ghost" disabled className="gap-1.5 shrink-0 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      Sent
                    </Button>
                  )}
                  {user.friendshipStatus === 'pending_received' && user.friendshipId && (
                    <Button size="sm" variant="default" className="gap-1.5 shrink-0" onClick={() => handleRespond(user.friendshipId!, 'accept')}>
                      <Check className="w-3.5 h-3.5" />
                      Accept
                    </Button>
                  )}
                  {user.friendshipStatus === 'accepted' && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <UserCheck className="w-3 h-3" />
                      Friends
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-4">
          <button
            onClick={() => setTab('friends')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'friends'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            My Friends
            {!friendsLoading && friends.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({friends.length})</span>
            )}
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              tab === 'requests'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Requests
            {!requestsLoading && requests.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Friends list */}
        {tab === 'friends' && (
          <>
            {friendsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No friends yet</p>
                <p className="text-sm mt-1">Search for people above to send a friend request.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <Card key={friend.id}>
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                        style={{ backgroundColor: friend.color }}
                      >
                        {getInitials(friend.name, friend.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.name ?? friend.email}</p>
                        {friend.name && <p className="text-xs text-muted-foreground truncate">{friend.email}</p>}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove friend</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {friend.name ?? friend.email} from your friends? You won't see their events on your calendar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => removeFriend(friend.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Friend requests */}
        {tab === 'requests' && (
          <>
            {requestsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                        {getInitials(req.requester.name, req.requester.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{req.requester.name ?? req.requester.email}</p>
                        {req.requester.name && (
                          <p className="text-xs text-muted-foreground truncate">{req.requester.email}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleRespond(req.id, 'accept')} className="gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespond(req.id, 'decline')}
                          className="gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
