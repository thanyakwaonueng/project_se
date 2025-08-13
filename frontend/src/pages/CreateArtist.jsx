import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function CreateArtist() {
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [bookingType, setBookingType] = useState('SOLO'); // adjust to match your BookingType enum
  const [description, setDescription] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  const [isIndependent, setIsIndependent] = useState(true);
  const [memberCount, setMemberCount] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  // social urls
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Build payload, converting types and removing empty fields
      const raw = {
        name: name.trim(),
        genre: genre.trim(),
        bookingType: bookingType.trim(), // must match Prisma BookingType enum
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

      // remove undefined fields so Prisma uses defaults / nulls properly
      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== '')
      );

      const res = await axios.post('/artists', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      setLoading(false);
      navigate(`/artists/${res.data.id}`);
    } catch (err) {
      setLoading(false);
      // show helpful server error if present
      const serverMessage = err.response?.data?.error || err.message || 'Failed to create artist';
      setError(serverMessage);
      console.error('CreateArtist error:', err);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 700 }}>
      <h2>Create Artist Profile</h2>

      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <label>
        Name *
        <input value={name} onChange={e => setName(e.target.value)} required />
      </label>
      <br />

      <label>
        Genre *
        <input value={genre} onChange={e => setGenre(e.target.value)} required />
      </label>
      <br />

      <label>
        Booking type *
        {/* Adjust options to match your BookingType enum values in Prisma */}
        <select value={bookingType} onChange={e => setBookingType(e.target.value)} required>
          <option value="FULL_BAND">FULL_BAND</option>
          <option value="TRIO">TRIO</option>
          <option value="DUO">DUO</option>
          <option value="SOLO">SOLO</option>
        </select>
      </label>
      <br />

      <label>
        Description
        <textarea value={description} onChange={e => setDescription(e.target.value)} />
      </label>
      <br />

      <label>
        Founding year
        <input
          value={foundingYear}
          onChange={e => setFoundingYear(e.target.value.replace(/\D/g, ''))}
          placeholder="e.g. 2010"
          maxLength={4}
        />
      </label>
      <br />

      <label>
        Independent
        <input
          type="checkbox"
          checked={isIndependent}
          onChange={e => setIsIndependent(e.target.checked)}
        />
      </label>
      <br />

      <label>
        Member count
        <input
          value={memberCount}
          onChange={e => setMemberCount(e.target.value.replace(/\D/g, ''))}
          placeholder="number"
        />
      </label>
      <br />

      <label>
        Contact email
        <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
      </label>
      <br />

      <label>
        Contact phone
        <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
      </label>
      <br />

      <label>
        Price min
        <input
          value={priceMin}
          onChange={e => setPriceMin(e.target.value)}
          placeholder="e.g. 1000.00"
        />
      </label>
      <br />

      <label>
        Price max
        <input
          value={priceMax}
          onChange={e => setPriceMax(e.target.value)}
          placeholder="e.g. 5000.00"
        />
      </label>
      <br />

      <label>
        Profile photo URL
        <input value={profilePhotoUrl} onChange={e => setProfilePhotoUrl(e.target.value)} />
      </label>
      <br />

      <h4>Social / Streaming Links (optional)</h4>
      <label>
        Spotify
        <input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} />
      </label>
      <br />
      <label>
        YouTube
        <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
      </label>
      <br />
      <label>
        Instagram
        <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
      </label>
      <br />

      <button type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Create Artist'}
      </button>
    </form>
  );
}

