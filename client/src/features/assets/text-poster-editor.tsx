import { useState } from 'react'
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import type { TextPage } from '../../lib/types'

const fonts = {
  handwritten: ['Handwritten', 'Poster Hand, cursive'],
  classic: ['Classic serif', 'Georgia, serif'],
  modern: ['Modern', 'Arial, sans-serif'],
  typewriter: ['Typewriter', 'monospace'],
}
const backgrounds = {
  black: ['Black', '#080808', '#fff'],
  cream: ['Warm paper', '#f5eddb', '#30271c'],
  forest: ['Forest', '#163b30', '#fff'],
  rose: ['Soft rose', '#f4dce1', '#432431'],
  white: ['White', '#fff', '#161616'],
}
export function TextPosterEditor({
  value,
  onChange,
  disabled,
}: {
  value: TextPage
  onChange: (value: TextPage) => void
  disabled: boolean
}) {
  const [error, setError] = useState('')
  const change = (key: keyof TextPage, next: string) => onChange({ ...value, [key]: next })
  const background = backgrounds[value.background as keyof typeof backgrounds]
  return (
    <>
      <TextField
        label='Your text'
        multiline
        minRows={4}
        required
        value={value.text}
        disabled={disabled}
        onChange={(e) => change('text', e.target.value)}
        slotProps={{ htmlInput: { 'aria-label': 'Your text', maxLength: 5000 } }}
        helperText={`${value.text.length}/5000 · Line breaks appear in your poster. Cyrillic supported.`}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <TextField
          select
          label='Font'
          value={value.font}
          disabled={disabled}
          onChange={(e) => change('font', e.target.value)}
        >
          {Object.entries(fonts).map(([id, [label, family]]) => (
            <MenuItem key={id} value={id} sx={{ fontFamily: family }}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label='Background'
          value={value.background}
          disabled={disabled}
          onChange={(e) => change('background', e.target.value)}
        >
          {Object.entries(backgrounds).map(([id, [label]]) => (
            <MenuItem key={id} value={id}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Box>
        <Button component='label' variant='outlined' disabled={disabled}>
          Upload logo
          <input
            hidden
            aria-label='Logo image'
            type='file'
            accept='image/png,image/jpeg,image/webp'
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (
                file.size > 1024 * 1024 ||
                !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
              ) {
                setError('Choose a PNG, JPEG or WebP logo under 1 MB.')
                return
              }
              const reader = new FileReader()
              reader.onload = () => {
                change('logo', String(reader.result))
                setError('')
              }
              reader.onerror = () => setError('Logo could not be read. Try again.')
              reader.readAsDataURL(file)
            }}
          />
        </Button>
        {value.logo && (
          <Button disabled={disabled} onClick={() => change('logo', '')}>
            Remove logo
          </Button>
        )}
        <Typography variant='caption' sx={{ mt: 1, display: 'block' }}>
          Optional · PNG, JPEG or WebP · up to 1 MB
        </Typography>
      </Box>
      {error && <Alert severity='error'>{error}</Alert>}
      <Box>
        <Typography variant='overline'>Live preview</Typography>
        <Box
          aria-label='Text poster preview'
          sx={{
            background: background[1],
            color: background[2],
            borderRadius: 2,
            p: { xs: 3, sm: 5 },
            minHeight: 240,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <Box
            component='p'
            sx={{
              fontFamily: fonts[value.font as keyof typeof fonts][1],
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              maxWidth: '100%',
              textAlign: 'center',
              fontSize: 30,
              lineHeight: 1.3,
              m: 0,
            }}
          >
            {value.text || 'Your words, your style.'}
          </Box>
          {value.logo && (
            <Box
              component='img'
              src={value.logo}
              alt='Logo preview'
              sx={{ maxWidth: '70%', maxHeight: 80, objectFit: 'contain' }}
            />
          )}
        </Box>
      </Box>
    </>
  )
}
