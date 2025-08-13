import 'package:flutter/material.dart';

import '../model/chat_message.dart';
import '../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatModel> _messages = [];
  final ApiService _apiService = ApiService();
  bool _isTyping = false;

  void _sendMessage() async {
    if (_controller.text.isEmpty) return;

    setState(() {
      _messages.add(ChatModel(text: _controller.text, isUser: true));
      _isTyping = true;
    });

    final response = await _apiService.sendMessage(_controller.text);
    _controller.clear();

    setState(() {
      _messages.add(ChatModel(text: response, isUser: false));
      _isTyping = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("ChatBot"), centerTitle: true),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return ListTile(
                  title: Align(
                    alignment: message.isUser
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      padding: EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: message.isUser ? Colors.blue : Colors.green,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                          message.text,
                          style: TextStyle(
                            color: Colors.white,
                          ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isTyping)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),
          Padding(
           padding: const EdgeInsets.symmetric(vertical: 10),
           child: Container(
             padding: EdgeInsets.fromLTRB(10, 0, 3, 0),
             decoration: BoxDecoration(
               color: Colors.grey[200],
               borderRadius: BorderRadius.circular(20),
               border: Border.all(
                 color: Colors.black,
                 width: 1,
               ),
             ),
             child: Row(
               children: [
                 Expanded(
                   child: TextField(
                     controller: _controller,
                     decoration: const InputDecoration(
                       hintText: "Type a message...",
                     ),
                   ),
                 ),
                 IconButton(
                   onPressed: _sendMessage,
                   icon: const Icon(Icons.send),
                 ),
               ],
             ),
           ),
          )
        ],
      ),
    );
  }
}
