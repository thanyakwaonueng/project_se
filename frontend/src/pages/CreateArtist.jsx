import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateArtist() {
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [bookingType, setBookingType] = useState('SOLO');
  const [description, setDescription] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  const [isIndependent, setIsIndependent] = useState(true);
  const [memberCount, setMemberCount] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/auth/me', { withCredentials: true })
      .then(res => {
        const u = res.data;
        if (u) {
          const p = u.performerInfo;
          const a = p.artistInfo;
          setHasProfile(true);
          setName(u.name || '');
          setGenre(a.genre || '');
          setBookingType(a.bookingType || 'SOLO');
          setDescription(a.description || '');
          setFoundingYear(a.foundingYear || '');
          setIsIndependent(a.isIndependent ?? true);
          setMemberCount(a.memberCount || '');
          setContactEmail(p.contactEmail || '');
          setContactPhone(p.contactPhone || '');
          setPriceMin(a.priceMin || '');
          setPriceMax(a.priceMax || '');
          setProfilePhotoUrl(u.profilePhotoUrl || '');
          setSpotifyUrl(a.spotifyUrl || '');
          setYoutubeUrl(p.youtubeUrl || '');
          setInstagramUrl(p.instagramUrl || '');
        }
      })
      .catch(err => console.error(err));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const raw = {
        name: name.trim(),
        genre: genre.trim(),
        bookingType: bookingType.trim(),
        description: description.trim() || undefined,
        foundingYear: foundingYear ? parseInt(foundingYear, 10) : undefined,
        isIndependent: Boolean(isIndependent),
        memberCount: memberCount ? parseInt(memberCount, 10) : undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        priceMin: priceMin ? parseFloat(priceMin) : undefined,
        priceMax: priceMax ? parseFloat(priceMax) : undefined,
        profilePhotoUrl: profilePhotoUrl.trim() || undefined,
        spotifyUrl: spotifyUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
      };

      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== '')
      );

      const res = await axios.post('/api/artists', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      setLoading(false);
      navigate(`/api/artists/${res.data.id}`);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to save artist');
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>
        {hasProfile ? 'Edit Artist Profile' : 'Create Artist Profile'}
      </h2>

      {error && (
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="form-control"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Genre *</label>
          <input
            value={genre}
            onChange={e => setGenre(e.target.value)}
            required
            className="form-control"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Booking Type *</label>
          <select
            value={bookingType}
            onChange={e => setBookingType(e.target.value)}
            required
            className="form-select"
          >
            <option value="FULL_BAND">FULL_BAND</option>
            <option value="TRIO">TRIO</option>
            <option value="DUO">DUO</option>
            <option value="SOLO">SOLO</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="form-control"
            placeholder="เล่าแนวดนตรี ผลงาน จุดเด่น ฯลฯ"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Founding Year</label>
          <input
            value={foundingYear}
            onChange={e => setFoundingYear(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 2010"
            maxLength={4}
            className="form-control"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={isIndependent}
            onChange={e => setIsIndependent(e.target.checked)}
          />
          <label style={{ fontWeight: 600 }}>Independent</label>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Member Count</label>
          <input
            value={memberCount}
            onChange={e => setMemberCount(e.target.value.replace(/\D/g, ''))}
            placeholder="number"
            className="form-control"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Contact Email</label>
          <input
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            className="form-control"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Contact Phone</label>
          <input
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            className="form-control"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Price Min</label>
            <input
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              placeholder="e.g. 1000.00"
              className="form-control"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Price Max</label>
            <input
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              placeholder="e.g. 5000.00"
              className="form-control"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Profile Photo URL</label>
          <input
            value={profilePhotoUrl}
            onChange={e => setProfilePhotoUrl(e.target.value)}
            className="form-control"
          />
        </div>

        <h4>Social / Streaming Links (optional)</h4>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Spotify</label>
          <input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} className="form-control" />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>YouTube</label>
          <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className="form-control" />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Instagram</label>
          <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} className="form-control" />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (hasProfile ? 'Updating…' : 'Creating…') : (hasProfile ? 'Update Artist' : 'Create Artist')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

