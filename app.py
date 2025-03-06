import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import json
import uuid
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes

# Configure OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("No OPENAI_API_KEY found in environment variables")

# Create the OpenAI client explicitly with the API key
client = OpenAI(api_key=OPENAI_API_KEY)

# Store chat sessions
chat_sessions = {}

# Assistant Categories
ASSISTANT_CATEGORIES = {
    "general": {
        "name": "General Assistant",
        "system_prompt": "You are RM, a helpful AI assistant that provides balanced and thoughtful responses."
    },
    "math": {
        "name": "Math Expert",
        "system_prompt": "You are RM's Math Expert mode. You will only answer mathematical questions with step-by-step solutions. If a user asks anything unrelated to math, politely suggest they switch to a different mode."
    },
    "coding": {
        "name": "Code Assistant",
        "system_prompt": "You are RM's Coding Assistant mode. Focus on providing clean, efficient code solutions with explanations. Use best practices and suggest alternatives where appropriate."
    },
    "philosophy": {
        "name": "Deep Thinker",
        "system_prompt": "You are RM's Deep Thinking mode. Provide thoughtful analysis on philosophical, ethical, and conceptual questions. Explore multiple perspectives."
    }
}

# Custom RM responses (these override model responses for specific queries)
RM_RESPONSES = {
    "what is your name": "I am RM",
    "your name": "I am RM",
    "name": "I am RM",
    "rm": "Yes, I am RM. How can I help you?",
    "h": "Hello! I am RM. How can I assist you today?"
}

# Serve static files (HTML, CSS, JS)
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({
        "categories": list(ASSISTANT_CATEGORIES.keys()),
        "details": ASSISTANT_CATEGORIES
    })

@app.route('/api/chat/new', methods=['POST'])
def create_chat():
    session_id = str(uuid.uuid4())
    data = request.json if request.is_json else {}
    
    chat_sessions[session_id] = {
        "id": session_id,
        "title": "New Chat",
        "created_at": datetime.now().isoformat(),
        "messages": [],
        "category": data.get('category', 'general')
    }
    return jsonify({"session_id": session_id})

@app.route('/api/chat/<session_id>', methods=['GET'])
def get_chat(session_id):
    if session_id not in chat_sessions:
        return jsonify({"error": "Chat session not found"}), 404
    
    return jsonify(chat_sessions[session_id])

@app.route('/api/chat/<session_id>/message', methods=['POST'])
def send_message(session_id):
    if session_id not in chat_sessions:
        return jsonify({"error": "Chat session not found"}), 404
    
    data = request.json
    user_message = data.get('message', '')
    category = data.get('category')
    
    # If a category is provided, update the session's category
    if category:
        chat_sessions[session_id]["category"] = category
    else:
        # Use the existing category or default to general
        category = chat_sessions[session_id].get("category", "general")
    
    # Ensure category is valid
    if category not in ASSISTANT_CATEGORIES:
        category = "general"
        
    # Update title based on first message
    if len(chat_sessions[session_id]["messages"]) == 0:
        chat_sessions[session_id]["title"] = user_message[:30] + "..." if len(user_message) > 30 else user_message
    
    # Add user message to history
    user_msg = {
        "id": str(uuid.uuid4()),
        "role": "user",
        "content": user_message,
        "timestamp": datetime.now().isoformat()
    }
    chat_sessions[session_id]["messages"].append(user_msg)
    
    # Check for custom RM responses
    normalized_msg = user_message.lower().strip()
    if normalized_msg in RM_RESPONSES:
        response_text = RM_RESPONSES[normalized_msg]
    else:
        # Only use the actual AI for non-custom responses
        try:
            # Get the system prompt for the current category
            system_prompt = ASSISTANT_CATEGORIES[category]["system_prompt"]
            
            # Create messages list for OpenAI
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add previous messages from history
            for msg in chat_sessions[session_id]["messages"]:
                if msg["role"] == "user":
                    messages.append({
                        "role": "user",
                        "content": msg["content"]
                    })
                elif msg["role"] == "assistant":
                    messages.append({
                        "role": "assistant",
                        "content": msg["content"]
                    })
            
            # Call OpenAI API using the new client format
            try:
                # Debug log
                print(f"Sending request to OpenAI with {len(messages)} messages and API key: {OPENAI_API_KEY[:5]}...")
                
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",  # You can change this to any model you prefer
                    messages=messages
                )
                
                response_text = completion.choices[0].message.content
            except Exception as api_error:
                print(f"OpenAI API error: {str(api_error)}")
                raise api_error
                
        except Exception as e:
            response_text = f"I encountered an error while processing your request. Technical details: {str(e)}"
    
    # Add assistant response to history
    assistant_msg = {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.now().isoformat(),
        "category": category
    }
    chat_sessions[session_id]["messages"].append(assistant_msg)
    
    return jsonify({
        "message": assistant_msg,
        "session": chat_sessions[session_id]
    })

@app.route('/api/chats', methods=['GET'])
def get_chats():
    chats_list = []
    for session_id, chat in chat_sessions.items():
        chats_list.append({
            "id": session_id,
            "title": chat["title"],
            "created_at": chat["created_at"],
            "category": chat.get("category", "general"),
            "message_count": len(chat["messages"])
        })
    
    # Sort by most recent first
    chats_list.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(chats_list)

@app.route('/api/chat/<session_id>', methods=['DELETE'])
def delete_chat(session_id):
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return jsonify({"success": True})
    return jsonify({"error": "Chat session not found"}), 404

if __name__ == '__main__':
    # Create the static folder if it doesn't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    
    # Print API key status (don't print the actual key)
    if OPENAI_API_KEY:
        print(f"OpenAI API key is set (starts with {OPENAI_API_KEY[:4]}...)")
    else:
        print("WARNING: No OpenAI API key found!")
    
    # Default port is 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)