import React, { useState, useRef } from 'react';
import { Box, IconButton, Dialog, DialogContent } from '@mui/material';
import { PlayArrow as PlayArrowIcon, Pause as PauseIcon, VolumeUp as VolumeUpIcon, VolumeOff as VolumeOffIcon, Fullscreen as FullscreenIcon, Close as CloseIcon } from '@mui/icons-material';
import ResumeTransformationAnimation from './ResumeTransformationAnimation';

const DemoVideo = ({ 
  videoUrl = "https://jobtailor-assets.s3.amazonaws.com/videos/demo-video.mp4",
  posterUrl = null,
  autoPlay = false,
  showControls = true,
  showTransformationPreview = true 
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showPlayButton, setShowPlayButton] = useState(!autoPlay);
  const [isMuted, setIsMuted] = useState(true); // Start muted for better UX
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnimation, setShowAnimation] = useState(showTransformationPreview && !autoPlay);
  const videoRef = useRef(null);
  const expandedVideoRef = useRef(null);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      // Hide animation and show video
      setShowAnimation(false);
      // Unmute on first play for better UX
      video.muted = false;
      setIsMuted(false);
      video.play();
      setIsPlaying(true);
      setShowPlayButton(false);
    } else {
      video.pause();
      setIsPlaying(false);
      setShowPlayButton(true);
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleExpand = () => {
    const currentTime = videoRef.current?.currentTime || 0;
    const wasPlaying = !videoRef.current?.paused;
    
    // Pause the original video first
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    setIsExpanded(true);
    
    // Sync the expanded video with the current video state
    setTimeout(() => {
      if (expandedVideoRef.current) {
        expandedVideoRef.current.currentTime = currentTime;
        expandedVideoRef.current.muted = isMuted;
        if (wasPlaying) {
          expandedVideoRef.current.play();
        }
      }
    }, 100);
  };

  const handleCloseExpanded = () => {
    const currentTime = expandedVideoRef.current?.currentTime || 0;
    const wasPlaying = !expandedVideoRef.current?.paused;
    
    // Pause the expanded video first
    if (expandedVideoRef.current) {
      expandedVideoRef.current.pause();
    }
    
    setIsExpanded(false);
    
    // Sync the main video with the expanded video state
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        videoRef.current.muted = isMuted;
        if (wasPlaying) {
          videoRef.current.play();
          setIsPlaying(true);
          setShowPlayButton(false);
        } else {
          setIsPlaying(false);
          setShowPlayButton(true);
        }
      }
    }, 100);
  };

  return (
    <>
    <Box sx={{
      position: 'relative',
      width: '100%',
      maxWidth: { xs: '350px', sm: '500px', md: '700px', lg: '800px', xl: '900px' },
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
      border: '2px solid rgba(255, 255, 255, 0.2)',
      bgcolor: '#000'
    }}>
      <video
        ref={videoRef}
        width="100%"
        height="auto"
        poster={posterUrl}
        muted={isMuted}
        playsInline
        preload="metadata"
        style={{
          display: 'block',
          borderRadius: '10px'
        }}
        onPlay={() => {
          setIsPlaying(true);
          setShowPlayButton(false);
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowPlayButton(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowPlayButton(true);
          // Show animation again when video ends
          if (showTransformationPreview) {
            setShowAnimation(true);
          }
        }}
        onVolumeChange={() => {
          const video = videoRef.current;
          if (video) {
            setIsMuted(video.muted);
          }
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Resume Transformation Animation Overlay */}
      {showAnimation && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          zIndex: 2
        }}>
          <ResumeTransformationAnimation 
            autoStart={true}
            onComplete={() => {
              // Keep showing animation until user clicks play
            }}
          />
        </Box>
      )}

      {/* Custom Play/Pause Button Overlay */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: showPlayButton ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        pointerEvents: showPlayButton ? 'auto' : 'none',
        zIndex: 3
      }}
      onClick={handlePlayPause}>
        {showPlayButton && (
          <Box sx={{ textAlign: 'center' }}>
            <IconButton sx={{
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              color: '#0A66C2',
              width: { xs: 70, md: 90 },
              height: { xs: 70, md: 90 },
              mb: 1,
              boxShadow: '0 4px 20px rgba(10, 102, 194, 0.3)',
              border: '2px solid rgba(10, 102, 194, 0.2)',
              '&:hover': {
                bgcolor: 'white',
                color: '#004182',
                transform: 'scale(1.1)',
                boxShadow: '0 6px 25px rgba(10, 102, 194, 0.4)',
                borderColor: '#0A66C2'
              }
            }}>
              <PlayArrowIcon sx={{ fontSize: { xs: 35, md: 45 } }} />
            </IconButton>
            {showAnimation && (
              <Box sx={{
                bgcolor: '#0A66C2',
                color: 'white',
                px: 2,
                py: 0.8,
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(10, 102, 194, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  bgcolor: '#004182',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(10, 102, 194, 0.4)'
                }
              }}>
                Watch Full Demo
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Expand Button - Top Right Corner */}
      <Box sx={{
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10
      }}>
        <IconButton 
          onClick={(e) => {
            e.stopPropagation();
            handleExpand();
          }}
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            width: { xs: 40, md: 45 },
            height: { xs: 40, md: 45 },
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              transform: 'scale(1.05)'
            }
          }}
        >
          <FullscreenIcon sx={{ fontSize: { xs: 18, md: 22 } }} />
        </IconButton>
      </Box>

      {/* Floating Controls */}
      {!showPlayButton && (
        <>
          {/* Mute Button - Left Bottom Corner */}
          <Box sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 10
          }}>
            <IconButton 
              onClick={(e) => {
                e.stopPropagation();
                handleMuteToggle();
              }}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                width: { xs: 45, md: 50 },
                height: { xs: 45, md: 50 },
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.9)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              {isMuted ? (
                <VolumeOffIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
              ) : (
                <VolumeUpIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
              )}
            </IconButton>
          </Box>

          {/* Play/Pause Button - Right Bottom Corner */}
          <Box sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 10
          }}>
            <IconButton 
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                width: { xs: 50, md: 60 },
                height: { xs: 50, md: 60 },
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.9)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              {isPlaying ? (
                <PauseIcon sx={{ fontSize: { xs: 24, md: 30 } }} />
              ) : (
                <PlayArrowIcon sx={{ fontSize: { xs: 24, md: 30 } }} />
              )}
            </IconButton>
          </Box>
        </>
      )}
    </Box>

    {/* Expanded Video Modal */}
    <Dialog
      open={isExpanded}
      onClose={handleCloseExpanded}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'black',
          maxWidth: '95vw',
          maxHeight: '95vh',
          m: 2
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black' }}>
        {/* Close Button */}
        <IconButton
          onClick={handleCloseExpanded}
          sx={{
            position: 'absolute',
            top: 15,
            right: 15,
            zIndex: 20,
            bgcolor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              transform: 'scale(1.05)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Expanded Video */}
        <Box sx={{
          position: 'relative',
          width: '100%',
          height: 'auto',
          maxHeight: '90vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <video
            ref={expandedVideoRef}
            width="100%"
            height="auto"
            controls
            style={{
              maxHeight: '90vh',
              objectFit: 'contain'
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </Box>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default DemoVideo;