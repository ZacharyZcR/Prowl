package output

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"
)

const (
	ColorReset  = "\033[0m"
	ColorRed    = "\033[31m"
	ColorGreen  = "\033[32m"
	ColorYellow = "\033[33m"
	ColorCyan   = "\033[36m"
	ColorBold   = "\033[1m"
	ColorDim    = "\033[2m"
)

func Success(msg string) {
	fmt.Printf("%s✓ %s%s\n", ColorGreen, msg, ColorReset)
}

func Error(msg string) {
	fmt.Fprintf(os.Stderr, "%s✗ %s%s\n", ColorRed, msg, ColorReset)
}

func Warn(msg string) {
	fmt.Printf("%s⚠ %s%s\n", ColorYellow, msg, ColorReset)
}

func Info(msg string) {
	fmt.Printf("%sℹ %s%s\n", ColorCyan, msg, ColorReset)
}

func Bold(msg string) string {
	return ColorBold + msg + ColorReset
}

func Dim(msg string) string {
	return ColorDim + msg + ColorReset
}

func PrintJSON(v any) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "json marshal error: %v\n", err)
		return
	}
	fmt.Println(string(data))
}

func PrintTable(headers []string, rows [][]string) {
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, strings.Join(headers, "\t"))
	fmt.Fprintln(w, strings.Repeat("---\t", len(headers)))
	for _, row := range rows {
		fmt.Fprintln(w, strings.Join(row, "\t"))
	}
	w.Flush()
}
