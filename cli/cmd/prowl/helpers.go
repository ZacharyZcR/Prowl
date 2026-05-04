package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/client"
	"github.com/ZacharyZcR/STC/cli/internal/output"
)

func exportToFile(c *client.Client, path, filename string) {
	resp, err := c.Get(path)
	if err != nil {
		output.Error(fmt.Sprintf("failed to export: %v", err))
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		output.Error(fmt.Sprintf("failed to read response: %v", err))
		os.Exit(1)
	}

	var apiErr struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    json.RawMessage `json:"data"`
	}
	if json.Unmarshal(body, &apiErr) == nil && apiErr.Code != 0 {
		output.Error(fmt.Sprintf("export failed: %s", apiErr.Message))
		os.Exit(1)
	}

	if err := os.WriteFile(filename, body, 0644); err != nil {
		output.Error(fmt.Sprintf("failed to write file: %v", err))
		os.Exit(1)
	}
	output.Success(fmt.Sprintf("Exported to %s", filename))
}
