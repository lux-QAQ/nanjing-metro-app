import React, { useState } from 'react';
import { 
  IconButton, Menu, Typography, Box, 
  Tooltip, Divider, Grid
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import { useThemeContext } from '../../contexts/ThemeContext';
import { rawLines } from '../../data/raw';

export const ThemeSelector: React.FC = () => {
  const { sourceColor, setSourceColor } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (color: string) => {
    setSourceColor(color);
  };

  return (
    <>
      <Tooltip title="自定义配色">
        <IconButton 
          onClick={handleClick} 
          color="inherit" 
          size="small"
          sx={{ 
            ml: 1,
            color: 'primary.main',
            bgcolor: 'primary.container',
            '&:hover': { bgcolor: 'primary.container', opacity: 0.8 }
          }}
        >
          <PaletteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: { 
            mt: 1.5, 
            borderRadius: 3, 
            minWidth: 260,
            bgcolor: 'surface.container',
            backgroundImage: 'none',
            overflow: 'visible'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            地铁灵感配色
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            选择一条线路，让界面焕然一新
          </Typography>

          <Grid container spacing={1}>
            {rawLines.map((line) => (
              // 修复：移除 item 属性，将 xs 改为 size (MUI v6 Grid2 语法)
              <Grid size={3} key={line.id}>
                <Tooltip title={`${line.name} (${line.color})`}>
                  <Box
                    onClick={() => handleSelect(line.color)}
                    sx={{
                      width: '100%',
                      paddingTop: '100%', // 1:1 Aspect Ratio
                      borderRadius: '50%',
                      bgcolor: line.color,
                      cursor: 'pointer',
                      position: 'relative',
                      border: sourceColor === line.color ? '3px solid' : '1px solid rgba(0,0,0,0.1)',
                      borderColor: sourceColor === line.color ? 'primary.main' : 'transparent',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                  >
                    {sourceColor === line.color && (
                      <CheckIcon 
                        sx={{ 
                          position: 'absolute', 
                          top: '50%', 
                          left: '50%', 
                          transform: 'translate(-50%, -50%)',
                          color: '#fff',
                          fontSize: '1rem',
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                        }} 
                      />
                    )}
                  </Box>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            自定义颜色
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              component="input" 
              type="color" 
              value={sourceColor}
              onChange={(e) => handleSelect(e.target.value)}
              sx={{
                width: 40,
                height: 40,
                p: 0,
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                '&::-webkit-color-swatch-wrapper': { p: 0 },
                '&::-webkit-color-swatch': { border: 'none', borderRadius: '50%' }
              }}
            />
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {sourceColor.toUpperCase()}
            </Typography>
          </Box>
        </Box>
      </Menu>
    </>
  );
};