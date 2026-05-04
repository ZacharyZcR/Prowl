package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/ZacharyZcR/STC/backend/pkg/llm"
)

// BuiltinExecutor handles built-in tools that run in-process.
type BuiltinExecutor struct {
	handlers map[string]func(ctx context.Context, args string) (string, error)
}

func NewBuiltinExecutor() *BuiltinExecutor {
	be := &BuiltinExecutor{
		handlers: make(map[string]func(ctx context.Context, args string) (string, error)),
	}
	be.handlers["get_datetime"] = toolGetDatetime
	be.handlers["math_calc"] = toolMathCalc
	return be
}

// Has returns true if the tool is built-in.
func (be *BuiltinExecutor) Has(name string) bool {
	_, ok := be.handlers[name]
	return ok
}

func (be *BuiltinExecutor) Execute(ctx context.Context, name string, arguments string) (string, error) {
	h, ok := be.handlers[name]
	if !ok {
		return "", fmt.Errorf("unknown builtin tool: %s", name)
	}
	return h(ctx, arguments)
}

// Register adds a custom tool handler.
func (be *BuiltinExecutor) Register(name string, handler func(ctx context.Context, args string) (string, error)) {
	be.handlers[name] = handler
}

// BuiltinToolDefinitions returns the Tool definitions for all built-in tools.
func BuiltinToolDefinitions() []llm.Tool {
	return []llm.Tool{
		{
			Type: "function",
			Function: llm.ToolFunction{
				Name:        "get_datetime",
				Description: "获取当前日期和时间，支持指定时区",
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"timezone": map[string]any{
							"type":        "string",
							"description": "时区名称，如 Asia/Shanghai、America/New_York。默认 UTC",
						},
					},
				},
			},
		},
		{
			Type: "function",
			Function: llm.ToolFunction{
				Name:        "math_calc",
				Description: "执行数学计算。支持基本运算（+、-、*、/、^、%）和常用函数（sqrt、abs、ceil、floor、round、log、sin、cos、tan）",
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"expression": map[string]any{
							"type":        "string",
							"description": "数学表达式，如 '(3+4)*2' 或 'sqrt(144)'",
						},
					},
					"required": []string{"expression"},
				},
			},
		},
	}
}

// --- tool implementations ---

func toolGetDatetime(_ context.Context, args string) (string, error) {
	var params struct {
		Timezone string `json:"timezone"`
	}
	_ = json.Unmarshal([]byte(args), &params)

	loc := time.UTC
	if params.Timezone != "" {
		l, err := time.LoadLocation(params.Timezone)
		if err != nil {
			return "", fmt.Errorf("invalid timezone: %s", params.Timezone)
		}
		loc = l
	}

	now := time.Now().In(loc)
	result := map[string]string{
		"datetime": now.Format(time.RFC3339),
		"date":     now.Format("2006-01-02"),
		"time":     now.Format("15:04:05"),
		"timezone": loc.String(),
		"weekday":  now.Weekday().String(),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func toolMathCalc(_ context.Context, args string) (string, error) {
	var params struct {
		Expression string `json:"expression"`
	}
	if err := json.Unmarshal([]byte(args), &params); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}
	if params.Expression == "" {
		return "", fmt.Errorf("expression is required")
	}

	result, err := evalExpr(params.Expression)
	if err != nil {
		return "", err
	}

	data, _ := json.Marshal(map[string]any{
		"expression": params.Expression,
		"result":     result,
	})
	return string(data), nil
}

// evalExpr is a simple recursive descent expression evaluator.
func evalExpr(expr string) (float64, error) {
	expr = strings.TrimSpace(expr)
	p := &exprParser{input: expr}
	result, err := p.parseExpr()
	if err != nil {
		return 0, err
	}
	if p.pos < len(p.input) {
		return 0, fmt.Errorf("unexpected character at position %d: %c", p.pos, p.input[p.pos])
	}
	return result, nil
}

type exprParser struct {
	input string
	pos   int
}

func (p *exprParser) skipSpaces() {
	for p.pos < len(p.input) && p.input[p.pos] == ' ' {
		p.pos++
	}
}

func (p *exprParser) parseExpr() (float64, error) {
	return p.parseAddSub()
}

func (p *exprParser) parseAddSub() (float64, error) {
	left, err := p.parseMulDiv()
	if err != nil {
		return 0, err
	}
	for {
		p.skipSpaces()
		if p.pos >= len(p.input) {
			break
		}
		op := p.input[p.pos]
		if op != '+' && op != '-' {
			break
		}
		p.pos++
		right, err := p.parseMulDiv()
		if err != nil {
			return 0, err
		}
		if op == '+' {
			left += right
		} else {
			left -= right
		}
	}
	return left, nil
}

func (p *exprParser) parseMulDiv() (float64, error) {
	left, err := p.parsePower()
	if err != nil {
		return 0, err
	}
	for {
		p.skipSpaces()
		if p.pos >= len(p.input) {
			break
		}
		op := p.input[p.pos]
		if op != '*' && op != '/' && op != '%' {
			break
		}
		p.pos++
		right, err := p.parsePower()
		if err != nil {
			return 0, err
		}
		switch op {
		case '*':
			left *= right
		case '/':
			if right == 0 {
				return 0, fmt.Errorf("division by zero")
			}
			left /= right
		case '%':
			if right == 0 {
				return 0, fmt.Errorf("modulo by zero")
			}
			left = math.Mod(left, right)
		}
	}
	return left, nil
}

func (p *exprParser) parsePower() (float64, error) {
	base, err := p.parseUnary()
	if err != nil {
		return 0, err
	}
	p.skipSpaces()
	if p.pos < len(p.input) && p.input[p.pos] == '^' {
		p.pos++
		exp, err := p.parsePower() // right-associative
		if err != nil {
			return 0, err
		}
		return math.Pow(base, exp), nil
	}
	return base, nil
}

func (p *exprParser) parseUnary() (float64, error) {
	p.skipSpaces()
	if p.pos < len(p.input) && p.input[p.pos] == '-' {
		p.pos++
		val, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		return -val, nil
	}
	return p.parsePrimary()
}

func (p *exprParser) parsePrimary() (float64, error) {
	p.skipSpaces()
	if p.pos >= len(p.input) {
		return 0, fmt.Errorf("unexpected end of expression")
	}

	// Parentheses
	if p.input[p.pos] == '(' {
		p.pos++
		val, err := p.parseExpr()
		if err != nil {
			return 0, err
		}
		p.skipSpaces()
		if p.pos >= len(p.input) || p.input[p.pos] != ')' {
			return 0, fmt.Errorf("missing closing parenthesis")
		}
		p.pos++
		return val, nil
	}

	// Function call
	if p.pos < len(p.input) && isAlpha(p.input[p.pos]) {
		start := p.pos
		for p.pos < len(p.input) && isAlpha(p.input[p.pos]) {
			p.pos++
		}
		name := strings.ToLower(p.input[start:p.pos])

		// Constants
		switch name {
		case "pi":
			return math.Pi, nil
		case "e":
			return math.E, nil
		}

		p.skipSpaces()
		if p.pos >= len(p.input) || p.input[p.pos] != '(' {
			return 0, fmt.Errorf("expected '(' after function %s", name)
		}
		p.pos++
		arg, err := p.parseExpr()
		if err != nil {
			return 0, err
		}
		p.skipSpaces()
		if p.pos >= len(p.input) || p.input[p.pos] != ')' {
			return 0, fmt.Errorf("missing closing parenthesis for %s", name)
		}
		p.pos++

		switch name {
		case "sqrt":
			return math.Sqrt(arg), nil
		case "abs":
			return math.Abs(arg), nil
		case "ceil":
			return math.Ceil(arg), nil
		case "floor":
			return math.Floor(arg), nil
		case "round":
			return math.Round(arg), nil
		case "log":
			return math.Log(arg), nil
		case "log10":
			return math.Log10(arg), nil
		case "sin":
			return math.Sin(arg), nil
		case "cos":
			return math.Cos(arg), nil
		case "tan":
			return math.Tan(arg), nil
		default:
			return 0, fmt.Errorf("unknown function: %s", name)
		}
	}

	// Number
	start := p.pos
	for p.pos < len(p.input) && (isDigit(p.input[p.pos]) || p.input[p.pos] == '.') {
		p.pos++
	}
	if p.pos == start {
		return 0, fmt.Errorf("unexpected character: %c", p.input[p.pos])
	}
	return strconv.ParseFloat(p.input[start:p.pos], 64)
}

func isAlpha(c byte) bool { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') }
func isDigit(c byte) bool { return c >= '0' && c <= '9' }
