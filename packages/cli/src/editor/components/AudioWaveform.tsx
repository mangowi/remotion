import {
	AudioData,
	getAudioData,
	getWaveformPortion,
} from '@remotion/media-utils';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
	TIMELINE_BORDER,
	TIMELINE_LAYER_HEIGHT,
} from '../helpers/timeline-layout';
import {
	AudioWaveformBar,
	WAVEFORM_BAR_LENGTH,
	WAVEFORM_BAR_MARGIN,
} from './AudioWaveformBar';

const container: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	position: 'absolute',
	height: TIMELINE_LAYER_HEIGHT,
};

const canvasStyle: React.CSSProperties = {
	position: 'absolute',
};

export const AudioWaveform: React.FC<{
	src: string;
	visualizationWidth: number;
	fps: number;
	startFrom: number;
	durationInFrames: number;
	setMaxMediaDuration: React.Dispatch<React.SetStateAction<number>>;
	volume: string | number;
}> = ({
	src,
	fps,
	startFrom,
	durationInFrames,
	visualizationWidth,
	setMaxMediaDuration,
	volume,
}) => {
	const [metadata, setMetadata] = useState<AudioData | null>(null);
	const mountState = useRef({isMounted: true});

	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const {current} = mountState;
		current.isMounted = true;
		return () => {
			current.isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (!canvas.current) {
			return;
		}
		const context = canvas.current.getContext('2d');
		if (!context) {
			return;
		}
		context.clearRect(0, 0, visualizationWidth, TIMELINE_LAYER_HEIGHT);
		// TODO: "1,1,1,1,1,1,1,"
		if (typeof volume === 'number' || typeof volume === 'undefined') {
			// The volume is a number, meaning it could change on each frame-
			// User did not use the (f: number) => number syntax, so we can't draw
			// a visualization.
			return;
		}

		const volumes = volume.split(',').map((v) => Number(v));
		context.beginPath();
		context.moveTo(0, TIMELINE_LAYER_HEIGHT);
		volumes.forEach((v, index) => {
			const x = (index / (volumes.length - 1)) * visualizationWidth;
			const y = (1 - v) * (TIMELINE_LAYER_HEIGHT - TIMELINE_BORDER * 2) + 1;
			if (index === 0) {
				context.moveTo(x, y);
			} else {
				context.lineTo(x, y);
			}
		});
		context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
		context.stroke();
	}, [visualizationWidth, metadata, startFrom, volume]);

	useEffect(() => {
		getAudioData(src)
			.then((data) => {
				if (mountState.current.isMounted) {
					setMaxMediaDuration(Math.floor(data.durationInSeconds * fps));
					setMetadata(data);
				}
			})
			.catch((err) => {
				console.error(`Could not load waveform for ${src}`, err);
			});
	}, [fps, setMaxMediaDuration, src]);

	const normalized = useMemo(() => {
		if (!metadata || metadata.numberOfChannels === 0) {
			return [];
		}
		const numberOfSamples = Math.floor(
			visualizationWidth / (WAVEFORM_BAR_LENGTH + WAVEFORM_BAR_MARGIN)
		);

		return getWaveformPortion({
			audioData: metadata,
			startTimeInSeconds: startFrom / fps,
			durationInSeconds: durationInFrames / fps,
			numberOfSamples,
		});
	}, [durationInFrames, fps, metadata, startFrom, visualizationWidth]);

	if (!metadata) {
		return null;
	}
	return (
		<div style={container}>
			{normalized.map((w) => {
				return <AudioWaveformBar key={w.index} amplitude={w.amplitude} />;
			})}
			<canvas
				ref={canvas}
				style={canvasStyle}
				width={visualizationWidth}
				height={TIMELINE_LAYER_HEIGHT}
			/>
		</div>
	);
};
