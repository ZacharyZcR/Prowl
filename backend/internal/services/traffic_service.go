package services

import (
	"context"
	"fmt"

	"go.uber.org/zap"
)

type TrafficService struct {
	container *ContainerService
	logger    *zap.Logger
}

func NewTrafficService(container *ContainerService, logger *zap.Logger) *TrafficService {
	return &TrafficService{container: container, logger: logger}
}

type TrafficCapture struct {
	TeamID      int    `json:"team_id"`
	ChallengeID int    `json:"challenge_id"`
	ContainerID string `json:"container_id"`
	Status      string `json:"status"`
	FilePath    string `json:"file_path"`
}

func (s *TrafficService) StartCapture(ctx context.Context, competitionID, teamID, challengeID int, networkName string) (*TrafficCapture, error) {
	containerName := fmt.Sprintf("tcpdump_%d_%d_%d", competitionID, teamID, challengeID)
	pcapPath := fmt.Sprintf("/captures/comp%d_team%d_chal%d.pcap", competitionID, teamID, challengeID)

	info, err := s.container.CreateAndStart(ctx, &ContainerConfig{
		Image:        "nicolaka/netshoot",
		Env:          map[string]string{},
		ExposedPorts: []string{},
		CPULimit:     0,
		MemoryLimit:  64 * 1024 * 1024,
		PidsLimit:    10,
		NetworkName:  networkName,
		ContainerName: containerName,
		Labels: map[string]string{
			"managed-by": "security-range",
			"role":       "traffic-capture",
			"team-id":    fmt.Sprintf("%d", teamID),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to start tcpdump sidecar: %w", err)
	}

	s.logger.Info("traffic capture started",
		zap.Int("team_id", teamID),
		zap.String("container", info.ContainerID),
	)

	return &TrafficCapture{
		TeamID:      teamID,
		ChallengeID: challengeID,
		ContainerID: info.ContainerID,
		Status:      "running",
		FilePath:    pcapPath,
	}, nil
}

func (s *TrafficService) StopCapture(ctx context.Context, containerID string) error {
	return s.container.StopAndRemove(ctx, containerID)
}
